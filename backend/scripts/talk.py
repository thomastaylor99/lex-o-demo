"""Terminal voice client (task T24, first milestone): the whole voice flow on the laptop's mic and
speakers, before any browser work. Live transcription, the concierge's handover to the skincare
expert in two voices, recommendations, a switch to French, and the timing of every stage.

Run from backend/:
    uv run python scripts/talk.py --mode ptt     Enter starts and stops each utterance
    uv run python scripts/talk.py --mode auto    the VAD ends an utterance after 600 ms of quiet
    uv run python scripts/talk.py --mode text    type the visitor's lines; an empty line ends
Options: --lang en|fr, --catalogue PATH, --mute (no audio device; timings as if it played),
--vad-threshold RMS (auto mode), --verbose (info logs). Ctrl+C ends the session.

Wear headphones: the mic pauses while the agents speak (half duplex), but laptop speakers still
reach the mic. Visitor audio stays in memory; nothing is written to disk.
"""

import argparse
import asyncio
import contextlib
import json
import logging
import os
import re
import shutil
import sys
import threading
import time
from collections import deque
from collections.abc import Coroutine, Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal, Protocol

import structlog
from mistralai.client import Mistral

from app.agents import FIRST_AGENT, build_agents
from app.catalogue.store import Catalogue
from app.conversation.agent import AgentConfig, Observer
from app.conversation.events import (
    AgentSwitched,
    AnyEvent,
    BasketUpdated,
    ErrorEvent,
    LinePlay,
    ProductsShown,
    ProfileUpdated,
    TextDelta,
    ToolFinished,
    ToolStarted,
    TurnDone,
)
from app.conversation.loop import run_turn
from app.conversation.mistral_stream import MistralStreamer
from app.conversation.session import Session, SessionStore
from app.lang import LANGUAGES, Language
from app.logging import configure_logging
from app.profile.extractor import make_profile_observer, mistral_parser
from app.profile.models import BeautyProfile
from app.settings import Settings
from app.tools import build_tools
from app.voice.language import detect
from app.voice.lines import LineCache
from app.voice.stt import (
    MistralTranscriber,
    SttDelta,
    Transcriber,
    TranscriptionError,
    TranscriptionStream,
)
from app.voice.tts import MistralSynthesizer, Synthesizer
from scripts._audio import DEFAULT_VAD_THRESHOLD, FRAME_MS, Mic, Speaker, Vad

BACKEND = Path(__file__).resolve().parents[1]
FIXTURE_CATALOGUE = BACKEND / "tests" / "fixtures" / "catalogue_fixture.json"
BRANDS = (
    "L'Oréal Paris",
    "CeraVe",
    "La Roche-Posay",
    "Elseve",
    "Elvive",
    "Revitalift",
    "Toleriane",
    "Anthelios",
)
MIN_SENTENCE_CHARS = 20
PREROLL_FRAMES = 300 // FRAME_MS  # audio kept from just before the VAD hears speech
MAX_UTTERANCE_S = 30.0  # auto mode ends an utterance here if the room never goes quiet
STT_OPEN_TIMEOUT_S = 5.0
STT_FINAL_TIMEOUT_S = 5.0
SENTENCE_TIMEOUT_S = 20.0  # speech for one sentence that runs past this is cut there
CLOSE_GRACE_S = 2.0  # at exit, time left to the transcription streams still closing

Mode = Literal["ptt", "auto", "text"]
SourceKind = Literal["line", "speech"]

log = structlog.get_logger()

# A sentence ends at ., ! or ? followed by whitespace, or at the end of the text unless a digit
# comes just before ("24." may go on as "24.90" in the next delta).
_SENTENCE_END = re.compile(r"[.!?]+(?=\s)|(?<!\d)[.!?]+\Z")
_PROFILE_DEFAULTS = BeautyProfile().model_dump(mode="json")


def split_sentences(text: str, min_chars: int = MIN_SENTENCE_CHARS) -> tuple[list[str], str]:
    """The complete sentences at the start of `text`, and the rest, still waiting for its end.

    A sentence shorter than `min_chars` merges with the one after it.
    """
    sentences: list[str] = []
    start = 0
    for match in _SENTENCE_END.finditer(text):
        sentence = text[start : match.end()].strip()
        if len(sentence) >= min_chars:
            sentences.append(sentence)
            start = match.end()
    return sentences, text[start:]


def context_bias(catalogue: Catalogue) -> list[str]:
    """Every product name in both languages, then the brands: whole names, each once."""
    names = [name for product in catalogue.all() for name in (product.name.en, product.name.fr)]
    return list(dict.fromkeys([*names, *BRANDS]))


def profile_fields(profile: Mapping[str, Any]) -> str:
    """The profile fields set so far, as key=value."""
    parts = []
    for key, value in profile.items():
        if value is None or value == [] or value == _PROFILE_DEFAULTS.get(key):
            continue
        shown = ",".join(map(str, value)) if isinstance(value, list) else value
        parts.append(f"{key}={shown}")
    return ", ".join(parts) or "nothing yet"


def products_line(products: Sequence[Mapping[str, Any]], best_match_id: str | None) -> str:
    shown = []
    for product in products:
        label = f"{product.get('brand')} {product.get('name')} €{product.get('price_eur', 0):.2f}"
        if product.get("id") == best_match_id:
            label += " (best match)"
        shown.append(label)
    return "; ".join(shown) or "none"


def describe(exc: BaseException) -> str:
    return f"{type(exc).__name__}: {exc}" if str(exc) else type(exc).__name__


def settle(*tasks: asyncio.Task[Any]) -> None:
    """Cancel the tasks still running, and mark the failures of finished ones as seen."""
    for task in tasks:
        if not task.done():
            task.cancel()
        elif not task.cancelled():
            task.exception()


async def _quietly(close: Coroutine[Any, Any, None]) -> None:
    with contextlib.suppress(Exception):
        await close


class Console:
    """Terminal output: one live line for the partial transcript, streamed replies, event lines."""

    _PARTIAL = "\0partial"

    def __init__(self) -> None:
        self._live = sys.stdout.isatty()
        self._open: str | None = None  # _PARTIAL, or the speaker whose reply is streaming

    def say(self, text: str) -> None:
        self._end_line()
        print(text, flush=True)

    def warn(self, text: str) -> None:
        self.say(f"[warning] {text}")

    def partial(self, text: str) -> None:
        """Rewrite the live line with the transcript so far (on a terminal only)."""
        if not self._live:
            return
        if self._open != self._PARTIAL:
            self._end_line()
        line = "you: " + " ".join(text.split())
        width = max(30, shutil.get_terminal_size().columns - 1)
        if len(line) > width:
            line = "you: ..." + line[-(width - 8) :]
        sys.stdout.write(f"\r\x1b[K{line}")
        sys.stdout.flush()
        self._open = self._PARTIAL

    def reply(self, speaker: str, text: str) -> None:
        """Stream a reply's text under its speaker's name."""
        if self._open != speaker:
            self._end_line()
            sys.stdout.write(f"{speaker}: ")
            text = text.lstrip()
        sys.stdout.write(text)
        sys.stdout.flush()
        self._open = speaker

    def _end_line(self) -> None:
        if self._open == self._PARTIAL:
            sys.stdout.write("\r\x1b[K")
        elif self._open is not None:
            sys.stdout.write("\n")
        self._open = None


class LineReader:
    """Lines from stdin, read on a daemon thread: the event loop never blocks on the keyboard and
    Ctrl+C never waits for a keypress. None means the input ended.
    """

    def __init__(self) -> None:
        self._lines: asyncio.Queue[str | None] = asyncio.Queue()
        self._ended = False

    def start(self) -> None:
        loop = asyncio.get_running_loop()
        threading.Thread(target=self._read, args=(loop,), name="stdin", daemon=True).start()

    async def get(self) -> str | None:
        if self._ended:
            return None
        line = await self._lines.get()
        self._ended = line is None
        return line

    def clear(self) -> None:
        """Forget earlier lines, such as Enter pressed while an agent was speaking."""
        while not self._lines.empty():
            if self._lines.get_nowait() is None:
                self._ended = True

    def _read(self, loop: asyncio.AbstractEventLoop) -> None:
        # os.read rather than sys.stdin: a thread blocked inside a buffered read can stall the exit.
        fd = sys.stdin.fileno()
        pending = b""
        while data := _read_some(fd):
            *lines, pending = (pending + data).split(b"\n")
            for line in lines:
                self._push(loop, line.decode(errors="replace").rstrip("\r"))
        if pending:
            self._push(loop, pending.decode(errors="replace"))
        self._push(loop, None)

    def _push(self, loop: asyncio.AbstractEventLoop, line: str | None) -> None:
        with contextlib.suppress(RuntimeError):  # the event loop closed at shutdown
            loop.call_soon_threadsafe(self._lines.put_nowait, line)


def _read_some(fd: int) -> bytes:
    try:
        return os.read(fd, 4096)
    except OSError:
        return b""


@dataclass
class _Source:
    """A fixed line or a sentence, as PCM chunks; None closes the queue."""

    kind: SourceKind
    agent_id: str
    voice_id: str
    chunks: asyncio.Queue[bytes | None]


class Narrator:
    """Plays fixed lines and sentences through the speaker, strictly in order.

    A sentence's speech starts streaming as soon as it is queued, so it is ready when its turn
    comes. A fixed line goes ahead of the sentences that have not started playing.
    """

    def __init__(
        self, speaker: Speaker, synthesizer: Synthesizer, lines: LineCache, console: Console
    ) -> None:
        self._speaker = speaker
        self._synthesizer = synthesizer
        self._lines = lines
        self._console = console
        self._queue: deque[_Source] = deque()
        self._tasks: set[asyncio.Task[None]] = set()
        self._wake = asyncio.Event()
        self._idle = asyncio.Event()
        self._idle.set()
        self.first_kind: SourceKind | None = None  # what the turn played first
        self.voices: dict[str, str] = {}  # agent id to voice id, for what the turn played

    def start(self) -> None:
        self._spawn(self._play())

    def new_turn(self) -> None:
        self.first_kind = None
        self.voices = {}

    def say(self, agent: AgentConfig, text: str, lang: Language) -> None:
        voice_id = agent.voices[lang]
        source = _Source("speech", agent.id, voice_id, asyncio.Queue())
        self._spawn(self._synthesize(text, voice_id, source.chunks))
        self._queue.append(source)
        self._wake_player()

    def line(self, agent: AgentConfig, line: str, lang: Language) -> None:
        source = _Source("line", agent.id, agent.voices[lang], asyncio.Queue())
        self._spawn(self._load_line(agent, line, lang, source.chunks))
        index = next((i for i, s in enumerate(self._queue) if s.kind != "line"), len(self._queue))
        self._queue.insert(index, source)
        self._wake_player()

    async def idle(self) -> None:
        """Return once everything queued has gone to the speaker."""
        await self._idle.wait()

    async def close(self) -> None:
        tasks = list(self._tasks)
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)

    def _wake_player(self) -> None:
        self._idle.clear()
        self._wake.set()

    def _spawn(self, work: Coroutine[Any, Any, None]) -> None:
        task = asyncio.create_task(work)
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    async def _play(self) -> None:
        while True:
            if not self._queue:
                self._idle.set()
                self._wake.clear()
                await self._wake.wait()
                continue
            source = self._queue.popleft()
            while (chunk := await source.chunks.get()) is not None:
                if self.first_kind is None:
                    self.first_kind = source.kind
                self.voices.setdefault(source.agent_id, source.voice_id)
                self._speaker.play(chunk)

    async def _synthesize(
        self, text: str, voice_id: str, chunks: asyncio.Queue[bytes | None]
    ) -> None:
        try:
            async with asyncio.timeout(SENTENCE_TIMEOUT_S):
                async for chunk in self._synthesizer.stream(text, voice_id):
                    chunks.put_nowait(chunk)
        except Exception as exc:  # a stall after the retry, or an API error
            self._console.warn(f"speech failed, sentence skipped ({describe(exc)}): {text}")
        finally:
            chunks.put_nowait(None)

    async def _load_line(
        self, agent: AgentConfig, line: str, lang: Language, chunks: asyncio.Queue[bytes | None]
    ) -> None:
        try:
            pcm = await self._lines.get(agent, line, lang)
            if pcm:
                chunks.put_nowait(pcm)
            else:
                self._console.warn(f"{agent.id} has no line {line!r}")
        except Exception as exc:
            self._console.warn(f"line {line!r} skipped ({describe(exc)})")
        finally:
            chunks.put_nowait(None)


@dataclass(frozen=True)
class Utterance:
    text: str
    speech_end: float  # monotonic; every timing counts from here
    final_at: float | None = None  # when the final transcript arrived; None for typed text


class Listener(Protocol):
    async def listen(self) -> Utterance | None:
        """The visitor's next utterance, with empty text when nothing usable was heard.

        None ends the session.
        """
        ...


class Stt:
    """One transcription stream per utterance, its live partial line, and background closes."""

    def __init__(self, transcriber: Transcriber, console: Console) -> None:
        self._transcriber = transcriber
        self._console = console
        self._closing: set[asyncio.Task[None]] = set()

    async def open(self) -> TranscriptionStream:
        async with asyncio.timeout(STT_OPEN_TIMEOUT_S):
            return await self._transcriber.open()

    async def transcript(self, stream: TranscriptionStream) -> tuple[str, float]:
        """Rewrite the partial line as deltas arrive; the final text, and when it arrived."""
        partial = ""
        try:
            async for event in stream.events():
                if isinstance(event, SttDelta):
                    partial += event.text
                    self._console.partial(partial)
                else:
                    return event.text.strip(), time.monotonic()
        except Exception as exc:
            self._console.warn(f"transcription failed ({describe(exc)})")
            raise
        raise TranscriptionError("the transcription ended without its final text")

    def close_later(self, stream: TranscriptionStream) -> None:
        """Close in the background: the server never answers the close, which takes about 1 s."""
        task = asyncio.create_task(_quietly(stream.close()))
        self._closing.add(task)
        task.add_done_callback(self._closing.discard)

    async def aclose(self) -> None:
        """Give the streams still closing a moment, then drop them."""
        if self._closing:
            await asyncio.wait(set(self._closing), timeout=CLOSE_GRACE_S)
        for task in list(self._closing):
            task.cancel()


class TextInput:
    """Typed lines stand in for speech; the end of speech is when the line is read."""

    def __init__(self, keys: LineReader) -> None:
        self._keys = keys

    async def listen(self) -> Utterance | None:
        line = await self._keys.get()
        if line is None or not line.strip():
            return None
        return Utterance(line.strip(), time.monotonic())


class PushToTalk:
    """Enter starts streaming the mic to a fresh transcription; Enter again ends the speech."""

    def __init__(self, mic: Mic, keys: LineReader, stt: Stt, console: Console) -> None:
        self._mic = mic
        self._keys = keys
        self._stt = stt
        self._console = console

    async def listen(self) -> Utterance | None:
        self._keys.clear()
        self._console.say("Press Enter to talk.")
        if await self._keys.get() is None:
            return None
        self._mic.resume()
        self._console.say("Listening. Press Enter to stop.")
        stop = asyncio.create_task(self._release())
        try:
            stream = await self._stt.open()
        except Exception as exc:
            self._mic.pause()
            self._console.warn(f"speech to text unavailable ({describe(exc)}); press Enter")
            await stop
            return Utterance("", time.monotonic())
        sender = asyncio.create_task(self._send(stream))
        reader = asyncio.create_task(self._stt.transcript(stream))
        try:
            speech_end = await stop
            await sender
            text, final_at = await asyncio.wait_for(reader, STT_FINAL_TIMEOUT_S)
        except Exception as exc:
            self._console.warn(f"utterance dropped ({describe(exc)})")
            return Utterance("", time.monotonic())
        finally:
            self._mic.pause()
            settle(stop, sender, reader)
            self._stt.close_later(stream)
        return Utterance(text, speech_end, final_at)

    async def _release(self) -> float:
        """Wait for the Enter that ends the speech, stop the mic there, and say when it came."""
        await self._keys.get()
        released = time.monotonic()
        self._mic.pause()
        return released

    async def _send(self, stream: TranscriptionStream) -> None:
        while (frame := await self._mic.read()) is not None:
            await stream.send(frame)
        await stream.end()


class AutoListen:
    """Streams the mic to a fresh transcription once the VAD hears speech, with 300 ms of
    pre-roll, and ends the speech at the last voiced frame once the VAD hears 600 ms of quiet.
    """

    def __init__(self, mic: Mic, vad: Vad, stt: Stt, console: Console) -> None:
        self._mic = mic
        self._vad = vad
        self._stt = stt
        self._console = console

    async def listen(self) -> Utterance | None:
        self._vad.reset()
        preroll: deque[bytes] = deque(maxlen=PREROLL_FRAMES)
        self._mic.resume()
        self._console.say("Listening...")
        while not self._vad.started:
            frame = await self._mic.read()
            if frame is None:
                return Utterance("", time.monotonic())
            self._vad.feed(frame)
            preroll.append(frame)
        try:
            stream = await self._stt.open()
        except Exception as exc:
            self._mic.pause()
            self._console.warn(f"speech to text unavailable ({describe(exc)})")
            return Utterance("", time.monotonic())
        reader = asyncio.create_task(self._stt.transcript(stream))
        try:
            speech_end = await self._send(stream, preroll)
            text, final_at = await asyncio.wait_for(reader, STT_FINAL_TIMEOUT_S)
        except Exception as exc:
            self._console.warn(f"utterance dropped ({describe(exc)})")
            return Utterance("", time.monotonic())
        finally:
            self._mic.pause()
            settle(reader)
            self._stt.close_later(stream)
        return Utterance(text, speech_end, final_at)

    async def _send(self, stream: TranscriptionStream, preroll: deque[bytes]) -> float:
        """Send the pre-roll and the speech until the VAD ends it; the last voiced frame's time."""
        for frame in preroll:
            await stream.send(frame)
        speech_end = time.monotonic() - self._mic.lag_s
        deadline = time.monotonic() + MAX_UTTERANCE_S
        while not self._vad.ended and time.monotonic() < deadline:
            frame = await self._mic.read()
            if frame is None:
                break
            await stream.send(frame)
            if self._vad.feed(frame):
                speech_end = time.monotonic() - self._mic.lag_s
        self._mic.pause()
        await stream.end()
        return speech_end


@dataclass
class TurnClock:
    """Monotonic marks of one turn, printed in ms from the end of speech."""

    speech_end: float
    stt_final_at: float | None = None
    first_token_at: float | None = None
    first_sentence_at: float | None = None

    def ms(self, at: float | None) -> str:
        return "-" if at is None else str(round((at - self.speech_end) * 1000))


@dataclass
class _Pending:
    """Reply text waiting for its sentence end, and the agent saying it."""

    agent: str | None = None
    text: str = ""


def timings_line(
    clock: TurnClock,
    first_audio_at: float | None,
    first_kind: SourceKind | None,
    done: TurnDone | None,
    voices: Mapping[str, str],
) -> str:
    audio = clock.ms(first_audio_at)
    if first_audio_at is not None and first_kind is not None:
        audio += f" ({first_kind})"
    parts = [
        f"stt_final {clock.ms(clock.stt_final_at)}",
        f"first_token {clock.ms(clock.first_token_at)}",
        f"first_sentence {clock.ms(clock.first_sentence_at)}",
        f"first_audio {audio}",
    ]
    if done is not None:
        timings = done.timings
        calls = ", ".join(
            f"{call.agent} {'-' if call.first_token_ms is None else call.first_token_ms}"
            f"/{call.duration_ms}"
            for call in timings.model_calls
        )
        tools = ", ".join(f"{tool.name} {tool.duration_ms}" for tool in timings.tools)
        parts += [f"model {calls or '-'}", f"tools {tools or '-'}", f"total {timings.total_ms}"]
    spoke = ", ".join(f"{agent} {voice_id[:8]}" for agent, voice_id in voices.items())
    parts.append(f"voices {spoke or '-'}")
    return "[timings] " + " | ".join(parts)


class Conversation:
    """Runs each turn through the conversation loop, prints its events, speaks and times it."""

    def __init__(
        self,
        *,
        session: Session,
        agents: Mapping[str, AgentConfig],
        streamer: MistralStreamer,
        observers: Sequence[Observer],
        observer_timeout_s: float,
        narrator: Narrator,
        speaker: Speaker,
        console: Console,
    ) -> None:
        self._session = session
        self._agents = agents
        self._streamer = streamer
        self._observers = observers
        self._observer_timeout_s = observer_timeout_s
        self._narrator = narrator
        self._speaker = speaker
        self._console = console

    async def welcome(self) -> None:
        concierge = self._agents[FIRST_AGENT]
        lang = self._session.language
        self._console.say(f"{concierge.display_name[lang]}: {concierge.lines['welcome'][lang]}")
        self._narrator.line(concierge, "welcome", lang)
        await self._drain()

    async def respond(self, utterance: Utterance) -> None:
        session = self._session
        session.language = detect(utterance.text, default=session.language)
        session.profile.language = session.language
        self._console.say(f"you ({session.language}): {utterance.text}")
        clock = TurnClock(utterance.speech_end, stt_final_at=utterance.final_at)
        self._speaker.mark_turn()
        self._narrator.new_turn()
        pending = _Pending()
        done: TurnDone | None = None
        events = run_turn(
            session,
            utterance.text,
            agents=self._agents,
            streamer=self._streamer,
            observers=self._observers,
            observer_timeout_s=self._observer_timeout_s,
        )
        async with contextlib.aclosing(events):
            async for event in events:
                self._show(event, pending, clock)
                if isinstance(event, TurnDone):
                    done = event
        self._flush(pending, clock)
        await self._drain()
        first_audio_at = self._speaker.first_sound_at
        voices = self._narrator.voices
        self._console.say(
            timings_line(clock, first_audio_at, self._narrator.first_kind, done, voices)
        )
        self._console.say("")

    def _show(self, event: AnyEvent, pending: _Pending, clock: TurnClock) -> None:
        lang = self._session.language
        match event:
            case TextDelta():
                if clock.first_token_at is None:
                    clock.first_token_at = time.monotonic()
                if pending.agent not in (None, event.agent):
                    self._flush(pending, clock)
                self._console.reply(self._agents[event.agent].display_name[lang], event.text)
                pending.agent = event.agent
                sentences, pending.text = split_sentences(pending.text + event.text)
                for sentence in sentences:
                    self._speak(event.agent, sentence, clock)
            case ToolStarted():
                self._flush(pending, clock)
                self._console.say(
                    f"[tool] {event.name} {json.dumps(event.args, ensure_ascii=False)}"
                )
            case ToolFinished(ok=False):
                self._console.say(f"[tool] {event.name} failed")
            case LinePlay():
                agent = self._agents[event.agent]
                text = agent.lines.get(event.line, {}).get(lang, event.line)
                self._console.say(f"{agent.display_name[lang]} (line): {text}")
                self._narrator.line(agent, event.line, lang)
            case AgentSwitched():
                self._flush(pending, clock)
                self._console.say(f"-> {event.from_agent} hands over to {event.to_agent}")
            case ProductsShown():
                self._console.say(
                    f"[products] {products_line(event.products, event.best_match_id)}"
                )
            case BasketUpdated():
                count = len(event.items)
                noun = "item" if count == 1 else "items"
                self._console.say(f"[basket] {count} {noun}, total €{event.total_eur:.2f}")
            case ProfileUpdated():
                self._console.say(f"[profile] {profile_fields(event.profile)}")
            case ErrorEvent():
                self._console.say(f"[error] {event.message}")
            case TurnDone():
                self._flush(pending, clock)

    def _flush(self, pending: _Pending, clock: TurnClock) -> None:
        text = pending.text.strip()
        if text and pending.agent is not None:
            self._speak(pending.agent, text, clock)
        pending.text = ""

    def _speak(self, agent_id: str, sentence: str, clock: TurnClock) -> None:
        if clock.first_sentence_at is None:
            clock.first_sentence_at = time.monotonic()
        self._narrator.say(self._agents[agent_id], sentence, self._session.language)

    async def _drain(self) -> None:
        await self._narrator.idle()
        await self._speaker.drained()


def pick_catalogue(given: Path | None, configured: Path) -> tuple[Path, str]:
    if given is not None:
        return given, "from --catalogue"
    if configured.exists():
        return configured, "settings.catalogue_path"
    return FIXTURE_CATALOGUE, f"fixture, as {_shown(configured)} does not exist yet"


def _shown(path: Path) -> str:
    resolved = path.resolve()
    return str(resolved.relative_to(BACKEND)) if resolved.is_relative_to(BACKEND) else str(path)


async def talk(args: argparse.Namespace) -> int:
    configure_logging()
    if not args.verbose:  # warnings and errors only: info lines would split the replies
        structlog.configure(wrapper_class=structlog.make_filtering_bound_logger(logging.WARNING))
    console = Console()
    settings = Settings()
    if not settings.mistral_api_key:
        console.say("MISTRAL_API_KEY is not set: add it to the repo's .env.")
        return 1
    path, origin = pick_catalogue(args.catalogue, settings.catalogue_path)
    if not path.exists():
        console.say(f"No catalogue at {path}.")
        return 1
    catalogue = Catalogue.load(path)
    agents = build_agents(settings, build_tools(catalogue))
    session = SessionStore(first_agent=FIRST_AGENT, ttl_s=settings.session_ttl_s).create(args.lang)
    bias = context_bias(catalogue)
    sound = "muted" if args.mute else "on"
    console.say(f"Mode {args.mode}, language {args.lang}, sound {sound}.")
    console.say(f"Catalogue {_shown(path)} ({origin}): {len(catalogue.all())} products.")
    console.say(f"Speech-to-text bias: {len(bias)} names.")

    async with Mistral(api_key=settings.mistral_api_key) as client:
        synthesizer = MistralSynthesizer(
            client,
            settings.tts_model,
            settings.tts_first_chunk_timeout_s,
            hedge_after_s=settings.tts_hedge_after_s,
            max_attempts=settings.tts_max_attempts,
            parallel_start=settings.tts_parallel_start,
        )
        lines = LineCache(synthesizer)
        started = time.perf_counter()
        await lines.warm(agents.values())
        console.say(f"Fixed lines warmed in {round((time.perf_counter() - started) * 1000)} ms.")
        stt = Stt(
            MistralTranscriber(
                client, settings.stt_model, settings.stt_streaming_delay_ms, context_bias=bias
            ),
            console,
        )
        speaker = Speaker(muted=args.mute)
        narrator = Narrator(speaker, synthesizer, lines, console)
        conversation = Conversation(
            session=session,
            agents=agents,
            streamer=MistralStreamer(
                client,
                fallback_model=settings.agent_fallback_model,
                temperature=settings.agent_temperature,
                first_token_timeout_s=settings.llm_first_token_timeout_s,
            ),
            observers=[make_profile_observer(mistral_parser(client), settings.extractor_model)],
            observer_timeout_s=settings.observer_timeout_s,
            narrator=narrator,
            speaker=speaker,
            console=console,
        )
        mic: Mic | None = None
        keys: LineReader | None = None
        listener: Listener
        if args.mode == "text":
            keys = LineReader()
            listener = TextInput(keys)
            console.say("Type the visitor's lines; an empty line ends the session.")
        elif args.mode == "ptt":
            mic, keys = Mic(), LineReader()
            listener = PushToTalk(mic, keys, stt, console)
        else:
            mic = Mic()
            listener = AutoListen(mic, Vad(args.vad_threshold), stt, console)
            console.say(
                f"VAD threshold {args.vad_threshold:g} RMS (int16). If it never hears you, lower"
                " it with --vad-threshold; if it never stops listening, raise it."
            )
        console.say(
            "Timings in ms from the end of speech. From the backend: model = first token/duration"
            " of each call, tools = duration, total = the whole turn."
        )
        console.say("")
        try:
            try:
                speaker.start()
                if mic is not None:
                    mic.start()
            except Exception as exc:
                console.say(f"Could not open the audio devices ({describe(exc)}).")
                console.say("Try --mute, or --mode text.")
                return 1
            if keys is not None:
                keys.start()
            narrator.start()
            await conversation.welcome()
            while (utterance := await listener.listen()) is not None:
                if not utterance.text:
                    console.say("(nothing heard)")
                    continue
                try:
                    await conversation.respond(utterance)
                except Exception as exc:
                    log.exception("talk_turn_failed")
                    console.warn(f"turn failed ({describe(exc)})")
        finally:
            if mic is not None:
                mic.stop()
            speaker.stop()
            await narrator.close()
            await stt.aclose()
    console.say("Session ended.")
    return 0


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Talk to the demo's agents from the terminal.")
    parser.add_argument("--mode", choices=("ptt", "auto", "text"), default="ptt")
    parser.add_argument("--lang", choices=LANGUAGES, default="en")
    parser.add_argument("--catalogue", type=Path, help="catalogue JSON (default: settings)")
    parser.add_argument(
        "--mute", action="store_true", help="open no audio device; timings as if it played"
    )
    parser.add_argument(
        "--vad-threshold",
        type=float,
        default=DEFAULT_VAD_THRESHOLD,
        help=f"auto mode: int16 RMS that counts as speech (default {DEFAULT_VAD_THRESHOLD:g})",
    )
    parser.add_argument("--verbose", action="store_true", help="show info logs")
    return parser.parse_args(argv)


def main() -> None:
    args = parse_args()
    try:
        code = asyncio.run(talk(args))
    except KeyboardInterrupt:
        print("\nSession ended.")
        code = 0
    sys.exit(code)


if __name__ == "__main__":
    main()
