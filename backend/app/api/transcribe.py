"""WS /ws/transcribe (spec 001): one utterance per socket, ported from the reference endpoint.

In: {"type": "audio", "audio": <base64 PCM, 16 kHz mono s16le>}, then {"type": "end"}.
Out: {"type": "text_delta", "text"} per delta, then {"type": "done", "text", "language",
"stt_final_ms"}, or {"type": "error", "message"}; then the socket closes. `stt_final_ms` runs
from receiving `end` to the final text. Audio stays in memory; logs hold text and timings only.
With a `session_id`, the audio forwarded counts in that session's usage, measured from its bytes:
the realtime `usage.prompt_audio_seconds` read 2 or 3 whatever the clip length (STT spike).
"""

import asyncio
import contextlib
import time
from dataclasses import dataclass
from typing import Annotated, Literal

import structlog
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import Base64Bytes, BaseModel, Field, TypeAdapter

from app.lang import Language
from app.services import Services
from app.voice.language import detect
from app.voice.stt import (
    PCM_BYTES_PER_SECOND,
    SttDelta,
    Transcriber,
    TranscriptionError,
    TranscriptionStream,
)

DONE_TIMEOUT_S = 5.0  # wait for the final text after `end`, as the reference did

logger = structlog.get_logger()
router = APIRouter()


class AudioMessage(BaseModel):
    type: Literal["audio"]
    audio: Base64Bytes


class EndMessage(BaseModel):
    type: Literal["end"]


BROWSER_MESSAGE: TypeAdapter[AudioMessage | EndMessage] = TypeAdapter(
    Annotated[AudioMessage | EndMessage, Field(discriminator="type")]
)


class TextDeltaMessage(BaseModel):
    type: Literal["text_delta"] = "text_delta"
    text: str


class DoneMessage(BaseModel):
    type: Literal["done"] = "done"
    text: str
    language: Language
    stt_final_ms: int


class ErrorMessage(BaseModel):
    type: Literal["error"] = "error"
    message: str


@dataclass
class _Utterance:
    default_language: Language
    end_at: float | None = None
    audio_bytes: int = 0  # PCM forwarded upstream


@router.websocket("/ws/transcribe")
async def transcribe(
    websocket: WebSocket, language: Language | None = None, session_id: str | None = None
) -> None:
    """Bridge one utterance; `language` is the default when the text cannot tell (else "en")."""
    await websocket.accept()
    services: Services = websocket.app.state.services
    transcriber: Transcriber = services.transcriber
    try:
        stream = await transcriber.open()
    except Exception as exc:
        await _fail(websocket, exc)
        return
    utterance = _Utterance(default_language=language or "en")
    try:
        async with asyncio.timeout(None) as deadline, asyncio.TaskGroup() as group:
            group.create_task(_pump_audio(websocket, stream, utterance, deadline))
            group.create_task(_forward_events(websocket, stream, utterance))
    except* WebSocketDisconnect:
        logger.info("stt_browser_left")
    except* TimeoutError:
        await _fail(websocket, TimeoutError(f"No final text {DONE_TIMEOUT_S:g} s after `end`"))
    except* Exception as errors:
        await _fail(websocket, errors.exceptions[0])
    else:
        with contextlib.suppress(WebSocketDisconnect, RuntimeError):
            await websocket.close()
    finally:
        # Count first: a cancelled handler would stop at the await below and lose the audio.
        _count_audio(services, session_id, utterance.audio_bytes)
        await stream.close()


async def _pump_audio(
    websocket: WebSocket,
    stream: TranscriptionStream,
    utterance: _Utterance,
    deadline: asyncio.Timeout,
) -> None:
    """Pass the browser's audio on until `end`, then give the final text a deadline."""
    while True:
        message = BROWSER_MESSAGE.validate_json(await websocket.receive_text())
        if isinstance(message, EndMessage):
            utterance.end_at = time.perf_counter()
            deadline.reschedule(asyncio.get_running_loop().time() + DONE_TIMEOUT_S)
            await stream.end()
            return
        await stream.send(message.audio)
        utterance.audio_bytes += len(message.audio)


async def _forward_events(
    websocket: WebSocket, stream: TranscriptionStream, utterance: _Utterance
) -> None:
    """Send each delta, then the final text with its language and stt_final_ms."""
    async for event in stream.events():
        if isinstance(event, SttDelta):
            await _send(websocket, TextDeltaMessage(text=event.text))
            continue
        end_at = utterance.end_at
        stt_final_ms = 0 if end_at is None else round((time.perf_counter() - end_at) * 1000)
        language = detect(event.text, default=utterance.default_language)
        await _send(
            websocket, DoneMessage(text=event.text, language=language, stt_final_ms=stt_final_ms)
        )
        logger.info("stt_done", text=event.text, language=language, stt_final_ms=stt_final_ms)
        return
    raise TranscriptionError("The transcription ended without a final text")


def _count_audio(services: Services, session_id: str | None, audio_bytes: int) -> None:
    """Add the seconds of audio forwarded to the session's usage, if the session is still live."""
    session = services.sessions.get(session_id) if session_id and audio_bytes else None
    if session is not None:
        session.usage.add_stt(services.settings.stt_model, audio_bytes / PCM_BYTES_PER_SECOND)


async def _send(websocket: WebSocket, message: BaseModel) -> None:
    await websocket.send_text(message.model_dump_json())


async def _fail(websocket: WebSocket, error: BaseException) -> None:
    """Tell the browser what went wrong, then close the socket; the browser may be gone already."""
    message = str(error) or type(error).__name__
    logger.warning("stt_error", error=message, kind=type(error).__name__)
    with contextlib.suppress(WebSocketDisconnect, RuntimeError):
        await _send(websocket, ErrorMessage(message=message))
        await websocket.close(code=1011)
