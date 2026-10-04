"""Tests for the /ws/transcribe bridge and MistralTranscriber (T13)."""

import asyncio
import base64
import json
from collections.abc import AsyncIterator
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from mistralai.client.models import AudioFormat
from starlette.websockets import WebSocketDisconnect

from app.api.transcribe import router
from app.voice.stt import MistralTranscriber, SttDelta, SttDone, TranscriptionError

FRAMES = [b"\x01\x00" * 160, b"\x02\x00" * 160]
FRENCH_WORDS = ["Je cherche une crème", " pour peau sèche"]


class FakeStream:
    """One delta per audio frame, then the final text once the audio ends."""

    def __init__(self, words: list[str], error: Exception | None) -> None:
        self.words = words
        self.error = error
        self.received: list[bytes] = []
        self.ended = False
        self.closed = False
        self._events: asyncio.Queue[SttDelta | SttDone | Exception] = asyncio.Queue()

    async def send(self, pcm: bytes) -> None:
        self.received.append(pcm)
        await self._events.put(self.error or SttDelta(self.words[len(self.received) - 1]))

    async def end(self) -> None:
        self.ended = True
        await self._events.put(SttDone("".join(self.words)))

    async def events(self) -> AsyncIterator[SttDelta | SttDone]:
        while True:
            event = await self._events.get()
            if isinstance(event, Exception):
                raise event
            yield event
            if isinstance(event, SttDone):
                return

    async def close(self) -> None:
        self.closed = True


class FakeTranscriber:
    def __init__(
        self,
        words: list[str] = FRENCH_WORDS,
        open_error: Exception | None = None,
        stream_error: Exception | None = None,
    ) -> None:
        self.words = words
        self.open_error = open_error
        self.stream_error = stream_error
        self.streams: list[FakeStream] = []

    async def open(self) -> FakeStream:
        if self.open_error is not None:
            raise self.open_error
        self.streams.append(FakeStream(self.words, self.stream_error))
        return self.streams[-1]


def make_client(transcriber: FakeTranscriber) -> TestClient:
    app = FastAPI()
    app.include_router(router)
    app.state.services = SimpleNamespace(transcriber=transcriber)
    return TestClient(app)


def audio(frame: bytes) -> dict[str, str]:
    return {"type": "audio", "audio": base64.b64encode(frame).decode()}


# ------------------------------------------------------------------ the browser bridge


def test_two_frames_and_end_give_the_deltas_then_done_with_text_language_and_timing():
    transcriber = FakeTranscriber()

    with make_client(transcriber).websocket_connect("/ws/transcribe?language=en") as ws:
        ws.send_json(audio(FRAMES[0]))
        ws.send_json(audio(FRAMES[1]))
        ws.send_json({"type": "end"})
        messages = [ws.receive_json() for _ in range(3)]
        with pytest.raises(WebSocketDisconnect) as closed:
            ws.receive_json()

    assert messages[:2] == [
        {"type": "text_delta", "text": "Je cherche une crème"},
        {"type": "text_delta", "text": " pour peau sèche"},
    ]
    done = messages[2]
    assert done.keys() == {"type", "text", "language", "stt_final_ms"}
    assert done["type"] == "done"
    assert done["text"] == "Je cherche une crème pour peau sèche"
    assert done["language"] == "fr"
    assert isinstance(done["stt_final_ms"], int)
    assert done["stt_final_ms"] >= 0
    assert closed.value.code == 1000
    [stream] = transcriber.streams
    assert stream.received == FRAMES
    assert stream.ended
    assert stream.closed


@pytest.mark.parametrize(("query", "language"), [("?language=fr", "fr"), ("", "en")])
def test_a_text_too_short_to_tell_takes_the_query_language_else_en(query, language):
    transcriber = FakeTranscriber(words=["OK"])

    with make_client(transcriber).websocket_connect(f"/ws/transcribe{query}") as ws:
        ws.send_json(audio(FRAMES[0]))
        ws.send_json({"type": "end"})
        messages = [ws.receive_json() for _ in range(2)]

    assert messages[1]["text"] == "OK"
    assert messages[1]["language"] == language


@pytest.mark.parametrize("where", ["open", "stream"])
def test_a_transcriber_error_reaches_the_browser_then_the_socket_closes(where):
    error = TranscriptionError("Model does not support context biasing.")
    transcriber = FakeTranscriber(**{f"{where}_error": error})

    with make_client(transcriber).websocket_connect("/ws/transcribe?language=en") as ws:
        ws.send_json(audio(FRAMES[0]))
        message = ws.receive_json()
        with pytest.raises(WebSocketDisconnect) as closed:
            ws.receive_json()

    assert message == {"type": "error", "message": "Model does not support context biasing."}
    assert closed.value.code == 1011
    assert all(stream.closed for stream in transcriber.streams)


# ------------------------------------------------------------------ MistralTranscriber

BIAS = ["La Roche-Posay", "Lancôme", "Minéral 89"]


class FakeSocket:
    def __init__(self) -> None:
        self.frames: list[dict[str, Any]] = []

    async def send(self, message: str) -> None:
        self.frames.append(json.loads(message))


class FakeConnection:
    """Stands in for the SDK's RealtimeConnection; `_websocket` takes the raw frames."""

    def __init__(self, *events: SimpleNamespace) -> None:
        self._websocket = FakeSocket()
        self._events = events
        self.audio: list[bytes] = []
        self.ended = False
        self.closed = False

    async def send_audio(self, pcm: bytes) -> None:
        self.audio.append(pcm)

    async def end_audio(self) -> None:
        self.ended = True

    async def close(self) -> None:
        self.closed = True

    def __aiter__(self) -> AsyncIterator[SimpleNamespace]:
        return self._iterate()

    async def _iterate(self) -> AsyncIterator[SimpleNamespace]:
        for event in self._events:
            yield event


def event(kind: str, **fields: Any) -> SimpleNamespace:
    return SimpleNamespace(type=kind, **fields)


def mistral_transcriber(
    connection: FakeConnection,
    model: str = "voxtral-transcribe-realtime-3",
    delay_ms: int | None = None,
    bias: list[str] = BIAS,
) -> tuple[MistralTranscriber, dict[str, Any]]:
    connect_kwargs: dict[str, Any] = {}

    async def connect(**kwargs: Any) -> FakeConnection:
        connect_kwargs.update(kwargs)
        return connection

    client: Any = SimpleNamespace(audio=SimpleNamespace(realtime=SimpleNamespace(connect=connect)))
    return MistralTranscriber(client, model, delay_ms, bias), connect_kwargs


async def test_mistral_stream_sends_the_bias_first_maps_events_and_stops_at_done():
    connection = FakeConnection(
        event("session.created"),
        event("transcription.text.delta", text="Je "),
        event("transcription.text.delta", text="cherche"),
        event("transcription.done", text="Je cherche", language=None),
        event("transcription.text.delta", text="never read"),
    )
    transcriber, connect_kwargs = mistral_transcriber(connection)

    stream = await transcriber.open()
    await stream.send(FRAMES[0])
    await stream.end()
    events = [item async for item in stream.events()]
    await stream.close()

    assert connect_kwargs == {
        "model": "voxtral-transcribe-realtime-3",
        "audio_format": AudioFormat(encoding="pcm_s16le", sample_rate=16000),
    }
    assert connection._websocket.frames == [
        {"type": "session.update", "session": {"context_bias": BIAS}}
    ]
    assert events == [SttDelta("Je "), SttDelta("cherche"), SttDone("Je cherche")]
    assert connection.audio == [FRAMES[0]]
    assert connection.ended
    assert connection.closed


@pytest.mark.parametrize(
    ("model", "bias"),
    [("voxtral-mini-transcribe-realtime-2602", BIAS), ("voxtral-transcribe-realtime-3", [])],
)
async def test_no_bias_frame_for_the_mini_model_or_an_empty_list(model, bias):
    connection = FakeConnection()
    transcriber, _ = mistral_transcriber(connection, model=model, bias=bias)

    await transcriber.open()

    assert connection._websocket.frames == []


async def test_the_streaming_delay_is_passed_only_when_set():
    connection = FakeConnection()
    transcriber, connect_kwargs = mistral_transcriber(connection, delay_ms=480)

    await transcriber.open()

    assert connect_kwargs["target_streaming_delay_ms"] == 480


async def test_an_error_event_raises_with_the_server_message():
    message = "Model 'voxtral-mini-transcribe-realtime-2602' does not support context biasing."
    connection = FakeConnection(event("error", error=SimpleNamespace(message=message, code=3051)))
    transcriber, _ = mistral_transcriber(connection)
    stream = await transcriber.open()

    with pytest.raises(TranscriptionError, match="does not support context biasing"):
        [item async for item in stream.events()]


async def test_a_connection_that_ends_before_done_raises():
    connection = FakeConnection(event("transcription.text.delta", text="Je "))
    transcriber, _ = mistral_transcriber(connection)
    stream = await transcriber.open()

    with pytest.raises(TranscriptionError):
        [item async for item in stream.events()]
