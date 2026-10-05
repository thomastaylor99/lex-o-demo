"""Tests for the speech routes and the TTS first-chunk retry (T14)."""

import asyncio
import base64
from collections.abc import AsyncIterator, Callable
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.voice import router
from app.conversation.agent import AgentConfig
from app.lang import Language
from app.voice.lines import LineCache
from app.voice.tts import MistralSynthesizer, Synthesizer

FORMAT = "f32le;rate=24000;channels=1"
CHUNKS = [b"\x00\x00\x80\x3f" * 3, b"\x00\x00\x00\x00" * 3, b"\x00\x00\x80\xbf" * 3]
STALL_S = 10.0
TIMEOUT_S = 0.05


class FakeSynthesizer:
    """Yields CHUNKS for any text, or raises the given error before the first chunk."""

    def __init__(self, error: Exception | None = None) -> None:
        self.requests: list[tuple[str, str]] = []
        self.error = error

    async def stream(
        self, text: str, voice_id: str, on_request: Callable[[int], None] | None = None
    ) -> AsyncIterator[bytes]:
        self.requests.append((text, voice_id))
        if on_request is not None:
            on_request(len(text))
        if self.error is not None:
            raise self.error
        for chunk in CHUNKS:
            await asyncio.sleep(0)
            yield chunk

    async def synthesize(self, text: str, voice_id: str) -> bytes:
        return b"".join([chunk async for chunk in self.stream(text, voice_id)])


def make_agent(agent_id: str, lines: dict[str, dict[Language, str]]) -> AgentConfig:
    return AgentConfig(
        id=agent_id,
        display_name={"en": agent_id, "fr": agent_id},
        role_label={"en": "Adviser", "fr": "Conseil"},
        model="mistral-small-latest",
        instructions="",
        tools=(),
        tool_choice=lambda session: "auto",
        voices={"en": f"{agent_id}-voice-en", "fr": f"{agent_id}-voice-fr"},
        lines=lines,
        context_block=lambda session: "",
    )


AGENTS = {
    "concierge": make_agent("concierge", {"welcome": {"en": "Welcome!", "fr": "Bienvenue !"}}),
    "skincare": make_agent("skincare", {"search": {"en": "Let me look.", "fr": "Je regarde."}}),
}


def make_client(synthesizer: Synthesizer) -> TestClient:
    app = FastAPI()
    app.include_router(router)
    app.state.services = SimpleNamespace(
        agents=AGENTS, synthesizer=synthesizer, lines=LineCache(synthesizer)
    )
    return TestClient(app)


# ------------------------------------------------------------------ fake Mistral client


def audio_event(chunk: bytes) -> SimpleNamespace:
    data = SimpleNamespace(type="speech.audio.delta", audio_data=base64.b64encode(chunk).decode())
    return SimpleNamespace(event="speech.audio.delta", data=data)


DONE_EVENT = SimpleNamespace(
    event="speech.audio.done", data=SimpleNamespace(type="speech.audio.done", usage=None)
)


class FakeEventStream:
    """Stands in for the SDK's EventStreamAsync: an async context manager and iterator."""

    def __init__(self, stall_s: float = 0.0) -> None:
        self._events = iter([*map(audio_event, CHUNKS), DONE_EVENT])
        self._stall_s = stall_s
        self.closed = False

    def __aiter__(self) -> FakeEventStream:
        return self

    async def __anext__(self) -> SimpleNamespace:
        await asyncio.sleep(self._stall_s)
        try:
            return next(self._events)
        except StopIteration:
            raise StopAsyncIteration from None

    async def __aenter__(self) -> FakeEventStream:
        return self

    async def __aexit__(self, *exc_info: object) -> None:
        await self.close()

    async def close(self) -> None:
        self.closed = True


STALL_BEFORE_HEADERS = None


class FakeSpeech:
    """client.audio.speech: each call answers with the next scripted stream.

    A None entry stalls before the response headers arrive, as most slow requests did in the spike.
    """

    def __init__(self, *responses: FakeEventStream | None) -> None:
        self._responses = list(responses)
        self.calls: list[dict[str, Any]] = []

    async def complete_async(self, **kwargs: Any) -> FakeEventStream:
        self.calls.append(kwargs)
        response = self._responses[len(self.calls) - 1]
        if response is None:
            await asyncio.sleep(STALL_S)
            raise AssertionError("the stalled request should have been cancelled")
        return response


def mistral_synthesizer(speech: FakeSpeech) -> MistralSynthesizer:
    client: Any = SimpleNamespace(audio=SimpleNamespace(speech=speech))
    return MistralSynthesizer(client, "voxtral-mini-tts-2603", first_chunk_timeout_s=TIMEOUT_S)


# ------------------------------------------------------------------ MistralSynthesizer


async def test_mistral_synthesizer_streams_the_decoded_pcm_of_each_delta():
    speech = FakeSpeech(FakeEventStream())

    chunks = [chunk async for chunk in mistral_synthesizer(speech).stream("Hello.", "voice-1")]

    assert chunks == CHUNKS
    assert speech.calls == [
        {
            "model": "voxtral-mini-tts-2603",
            "input": "Hello.",
            "voice_id": "voice-1",
            "response_format": "pcm",
            "stream": True,
        }
    ]


@pytest.mark.parametrize("where", ["before_headers", "before_first_chunk"])
async def test_a_first_chunk_slower_than_the_timeout_triggers_exactly_one_retry(where):
    stalled = FakeEventStream(stall_s=STALL_S)
    healthy = FakeEventStream()
    speech = FakeSpeech(STALL_BEFORE_HEADERS if where == "before_headers" else stalled, healthy)

    pcm = await mistral_synthesizer(speech).synthesize("Hello.", "voice-1")

    assert pcm == b"".join(CHUNKS)
    assert len(speech.calls) == 2
    assert speech.calls[1] == speech.calls[0]
    assert healthy.closed
    if where == "before_first_chunk":
        assert stalled.closed


async def test_two_stalls_raise_timeout_error():
    speech = FakeSpeech(FakeEventStream(stall_s=STALL_S), STALL_BEFORE_HEADERS)

    with pytest.raises(TimeoutError):
        await mistral_synthesizer(speech).synthesize("Hello.", "voice-1")
    assert len(speech.calls) == 2


# ------------------------------------------------------------------ routes


def test_speak_streams_the_chunks_in_order_in_the_agent_voice_with_the_format_header():
    synthesizer = FakeSynthesizer()

    response = make_client(synthesizer).post(
        "/voice/speak", json={"agent": "skincare", "language": "fr", "text": "Bonjour !"}
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/octet-stream"
    assert response.headers["x-audio-format"] == FORMAT
    assert response.content == b"".join(CHUNKS)
    assert synthesizer.requests == [("Bonjour !", "skincare-voice-fr")]


def test_speak_answers_504_after_two_stalls():
    speech = FakeSpeech(FakeEventStream(stall_s=STALL_S), FakeEventStream(stall_s=STALL_S))

    response = make_client(mistral_synthesizer(speech)).post(
        "/voice/speak", json={"agent": "concierge", "language": "en", "text": "Hello."}
    )

    assert response.status_code == 504
    assert len(speech.calls) == 2


def test_speak_answers_504_when_the_synthesizer_times_out_before_the_first_chunk():
    synthesizer = FakeSynthesizer(error=TimeoutError())

    response = make_client(synthesizer).post(
        "/voice/speak", json={"agent": "concierge", "language": "en", "text": "Hello."}
    )

    assert response.status_code == 504


def test_speak_answers_404_for_an_unknown_agent():
    synthesizer = FakeSynthesizer()

    response = make_client(synthesizer).post(
        "/voice/speak", json={"agent": "makeup", "language": "en", "text": "Hello."}
    )

    assert response.status_code == 404
    assert synthesizer.requests == []


@pytest.mark.parametrize("text", ["", "x" * 401])
def test_speak_rejects_text_outside_1_to_400_characters(text):
    response = make_client(FakeSynthesizer()).post(
        "/voice/speak", json={"agent": "concierge", "language": "en", "text": text}
    )

    assert response.status_code == 422


def test_line_answers_the_cached_pcm_with_the_format_header():
    synthesizer = FakeSynthesizer()
    client = make_client(synthesizer)

    first = client.get("/voice/lines/concierge/welcome/fr")
    second = client.get("/voice/lines/concierge/welcome/fr")

    assert first.status_code == second.status_code == 200
    assert first.headers["content-type"] == "application/octet-stream"
    assert first.headers["x-audio-format"] == FORMAT
    assert first.content == second.content == b"".join(CHUNKS)
    assert synthesizer.requests == [("Bienvenue !", "concierge-voice-fr")]


@pytest.mark.parametrize(
    "path", ["/voice/lines/makeup/welcome/en", "/voice/lines/concierge/goodbye/en"]
)
def test_line_answers_404_for_an_unknown_agent_or_line(path):
    synthesizer = FakeSynthesizer()

    response = make_client(synthesizer).get(path)

    assert response.status_code == 404
    assert synthesizer.requests == []
