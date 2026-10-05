"""Speech to text over the realtime transcription API (spikes/2026-10-04-realtime-stt).

One connection per utterance: the server drops the socket right after `transcription.done`
without a close frame, so reading stops there. No language event ever arrives; the language
comes from the text (app.voice.language).
"""

import json
from collections.abc import AsyncIterator, Sequence
from dataclasses import dataclass
from typing import Protocol

from mistralai.client import Mistral
from mistralai.client.models import AudioFormat
from mistralai.extra.realtime import RealtimeConnection
from websockets.exceptions import ConnectionClosed

AUDIO_FORMAT = AudioFormat(encoding="pcm_s16le", sample_rate=16000)
PCM_BYTES_PER_SECOND = 16000 * 2  # 16 kHz mono, two bytes a sample
# The only model that accepts context_bias; the 2602 mini answers it with an error and a 1011 close.
BIAS_MODEL = "voxtral-transcribe-realtime-3"


@dataclass(frozen=True)
class SttDelta:
    text: str


@dataclass(frozen=True)
class SttDone:
    text: str


class TranscriptionError(Exception):
    """An error from the transcription server, or a connection that ended before the final text."""


class TranscriptionStream(Protocol):
    async def send(self, pcm: bytes) -> None: ...

    async def end(self) -> None: ...

    def events(self) -> AsyncIterator[SttDelta | SttDone]: ...

    async def close(self) -> None: ...


class Transcriber(Protocol):
    async def open(self) -> TranscriptionStream: ...


class MistralTranscriber:
    """Realtime transcription of 16 kHz mono PCM, biased towards the names in `context_bias`."""

    def __init__(
        self,
        client: Mistral,
        model: str,
        streaming_delay_ms: int | None,
        context_bias: Sequence[str],
    ) -> None:
        self._client = client
        self._model = model
        self._streaming_delay_ms = streaming_delay_ms
        self._context_bias = list(context_bias)

    async def open(self) -> TranscriptionStream:
        delay = (
            {}
            if self._streaming_delay_ms is None
            else {"target_streaming_delay_ms": self._streaming_delay_ms}
        )
        connection = await self._client.audio.realtime.connect(
            model=self._model, audio_format=AUDIO_FORMAT, **delay
        )
        if self._context_bias and self._model == BIAS_MODEL:
            try:
                await _send_context_bias(connection, self._context_bias)
            except BaseException:
                await connection.close()
                raise
        return _MistralStream(connection)


async def _send_context_bias(connection: RealtimeConnection, names: list[str]) -> None:
    """SDK 3.0.0 has no context_bias field, so send the raw frame the server accepts (STT spike).

    `_websocket` is private: check this on every SDK upgrade. Names stay whole ("La Roche-Posay"):
    a list holding "Roche-Posay" alone produced "Le Roche-Posay".
    """
    frame = {"type": "session.update", "session": {"context_bias": names}}
    await connection._websocket.send(json.dumps(frame))


class _MistralStream:
    def __init__(self, connection: RealtimeConnection) -> None:
        self._connection = connection

    async def send(self, pcm: bytes) -> None:
        await self._connection.send_audio(pcm)

    async def end(self) -> None:
        await self._connection.end_audio()

    async def events(self) -> AsyncIterator[SttDelta | SttDone]:
        """Deltas, then the final text. Raises TranscriptionError on a server error or early end."""
        try:
            async for event in self._connection:
                if event.type == "transcription.text.delta":
                    yield SttDelta(event.text)
                elif event.type == "transcription.done":
                    yield SttDone(event.text)
                    return
                elif event.type == "error":
                    raise TranscriptionError(str(event.error.message))
        except ConnectionClosed as exc:
            raise TranscriptionError(f"Transcription connection closed: {exc}") from exc
        raise TranscriptionError("Transcription connection closed before the final text")

    async def close(self) -> None:
        await self._connection.close()
