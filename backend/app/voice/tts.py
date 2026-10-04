"""Speech output: one sentence streamed as raw PCM in a given voice (spikes/2026-10-04-tts).

The PCM is float32 little-endian, 24 kHz, mono. About one request in ten stalls before its first
chunk, sometimes for 10 s, so a slow request gets a second one raced against it (hedging) and
the first to deliver audio wins.
"""

import asyncio
import base64
import re
import time
from collections.abc import AsyncIterator
from typing import Protocol

import structlog
from mistralai.client import Mistral
from mistralai.client.models import SpeechStreamEvents
from mistralai.client.utils.eventstreaming import EventStreamAsync

AUDIO_FORMAT = "f32le;rate=24000;channels=1"

SpeechEvents = EventStreamAsync[SpeechStreamEvents]

logger = structlog.get_logger()


class Synthesizer(Protocol):
    def stream(self, text: str, voice_id: str) -> AsyncIterator[bytes]: ...

    async def synthesize(self, text: str, voice_id: str) -> bytes: ...


class MistralSynthesizer:
    """Streamed TTS over `client.audio.speech`, hedged when the first chunk is late.

    Each attempt gets `first_chunk_timeout_s` to deliver its first chunk. A new attempt starts
    every `hedge_after_s` (defaults to the timeout) until one delivers or `max_attempts` ran.
    """

    def __init__(
        self,
        client: Mistral,
        model: str,
        first_chunk_timeout_s: float,
        *,
        hedge_after_s: float | None = None,
        max_attempts: int = 2,
    ) -> None:
        self._client = client
        self._model = model
        self._first_chunk_timeout_s = first_chunk_timeout_s
        self._hedge_after_s = first_chunk_timeout_s if hedge_after_s is None else hedge_after_s
        self._max_attempts = max_attempts

    async def stream(self, text: str, voice_id: str) -> AsyncIterator[bytes]:
        """PCM chunks as they arrive. Raises TimeoutError when every attempt stalls."""
        text = speakable(text)
        if not text:
            return
        started = time.perf_counter()
        events, chunk = await self._start(text, voice_id)
        first_chunk_ms = round((time.perf_counter() - started) * 1000)
        logger.info("tts_first_chunk", voice_id=voice_id, first_chunk_ms=first_chunk_ms)
        async with events:
            while chunk is not None:
                yield chunk
                chunk = await _next_audio(events)

    async def synthesize(self, text: str, voice_id: str) -> bytes:
        return b"".join([chunk async for chunk in self.stream(text, voice_id)])

    async def _start(self, text: str, voice_id: str) -> tuple[SpeechEvents, bytes | None]:
        """The first attempt to deliver audio wins; the others are cancelled and closed."""
        pending: set[asyncio.Task[tuple[SpeechEvents, bytes | None]]] = set()
        error: BaseException | None = None
        attempts = 0
        try:
            while True:
                if attempts < self._max_attempts:
                    if attempts:
                        logger.warning("tts_hedge", voice_id=voice_id, attempt=attempts + 1)
                    pending.add(asyncio.create_task(self._attempt(text, voice_id)))
                    attempts += 1
                if not pending:
                    break
                timeout = self._hedge_after_s if attempts < self._max_attempts else None
                done, pending = await asyncio.wait(
                    pending, timeout=timeout, return_when=asyncio.FIRST_COMPLETED
                )
                winner: tuple[SpeechEvents, bytes | None] | None = None
                for task in done:
                    if task.exception() is not None:
                        error = task.exception()
                    elif winner is None:
                        winner = task.result()
                    else:
                        await task.result()[0].close()
                if winner is not None:
                    return winner
        finally:
            for task in pending:
                task.cancel()
            if pending:
                await asyncio.gather(*pending, return_exceptions=True)
        if error is None or isinstance(error, TimeoutError):
            raise TimeoutError(f"no first TTS chunk after {attempts} attempts")
        raise error

    async def _attempt(self, text: str, voice_id: str) -> tuple[SpeechEvents, bytes | None]:
        """Open one stream and read its first chunk within the deadline; close it on any failure."""
        events: SpeechEvents | None = None
        try:
            async with asyncio.timeout(self._first_chunk_timeout_s):
                events = await self._client.audio.speech.complete_async(
                    model=self._model,
                    input=text,
                    voice_id=voice_id,
                    response_format="pcm",
                    stream=True,
                )
                return events, await _next_audio(events)
        except BaseException:
            if events is not None:
                await events.close()
            raise


_MARKDOWN = re.compile(r"[*_`#]+")
_BULLET = re.compile(r"^\s*[-•]\s+", flags=re.MULTILINE)
_SPACES = re.compile(r"\s+")


def speakable(text: str) -> str:
    """Text as it should be spoken: markdown symbols and list bullets removed, spaces collapsed."""
    return _SPACES.sub(" ", _MARKDOWN.sub("", _BULLET.sub("", text))).strip()


async def _next_audio(events: AsyncIterator[SpeechStreamEvents]) -> bytes | None:
    """The next PCM chunk, or None once `speech.audio.done` arrives or the stream ends."""
    async for event in events:
        if event.event == "speech.audio.delta":
            return base64.b64decode(event.data.audio_data)
        if event.event == "speech.audio.done":
            return None
    return None
