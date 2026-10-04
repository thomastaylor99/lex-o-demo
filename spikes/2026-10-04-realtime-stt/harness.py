"""Realtime STT harness: stream a PCM clip at real-time pace through the SDK and time every event.

The SDK parses frames into models that drop unknown fields, so `Tap` wraps the SDK's websocket and keeps
every raw frame with its arrival time. Field names in the logs are exactly as the server sent them.
"""

from __future__ import annotations

import asyncio
import json
import time
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any

import websockets
from mistralai.client import Mistral
from mistralai.client.models import AudioFormat, RealtimeTranscriptionError
from mistralai.extra.realtime import RealtimeConnection, UnknownRealtimeEvent

from common import CHUNK_BYTES, CHUNK_MS, SAMPLE_RATE, pcm_seconds

AUDIO_FORMAT = AudioFormat(encoding="pcm_s16le", sample_rate=SAMPLE_RATE)


class Tap:
    """Stands in for the SDK's websocket: forwards everything, records raw frames (audio payloads summarised)."""

    def __init__(self, websocket: Any, frames: list[dict[str, Any]]) -> None:
        self._ws = websocket
        self.frames = frames

    async def send(self, message: str) -> None:
        payload = json.loads(message)
        if payload.get("type") == "input_audio.append":
            payload = {"type": "input_audio.append", "audio": f"<{len(payload['audio'])} base64 chars>"}
        self.frames.append({"t": time.perf_counter(), "dir": "out", "frame": payload})
        await self._ws.send(message)

    async def close(self, code: int = 1000, reason: str = "") -> None:
        await self._ws.close(code=code, reason=reason)

    def __aiter__(self) -> AsyncIterator[str]:
        return self._iterate()

    async def _iterate(self) -> AsyncIterator[str]:
        async for message in self._ws:
            text = message.decode("utf-8", "replace") if isinstance(message, (bytes, bytearray)) else message
            try:
                frame: Any = json.loads(text)
            except json.JSONDecodeError:
                frame = {"invalid_json": text}
            self.frames.append({"t": time.perf_counter(), "dir": "in", "frame": frame})
            yield message


@dataclass
class SessionResult:
    model: str
    clip: str
    delay_ms: int | None
    flush: bool
    bias: list[str] | None
    audio_s: float
    raw_session: dict[str, Any] | None = None
    connect_s: float = 0.0
    first_send: float = 0.0
    last_send: float = 0.0
    end_sent: float = 0.0
    frames: list[dict[str, Any]] = field(default_factory=list)
    handshake: list[dict[str, Any]] = field(default_factory=list)
    error: str | None = None

    def summary(self, reference: str | None = None) -> dict[str, Any]:
        """Timings relative to the last audio chunk sent (end of audio), plus text and the event log."""
        incoming = [f for f in self.frames if f["dir"] == "in"]
        deltas = [f for f in incoming if f["frame"].get("type") == "transcription.text.delta"]
        done = next((f for f in incoming if f["frame"].get("type") == "transcription.done"), None)
        end = self.last_send

        def rel(t: float | None, base: float) -> float | None:
            return None if t is None else round(t - base, 3)

        first_after_end = next((f["t"] for f in deltas if f["t"] > end), None)
        delta_text = "".join(f["frame"].get("text", "") for f in deltas)
        text_before_end = "".join(f["frame"].get("text", "") for f in deltas if f["t"] <= end)
        final_text = done["frame"].get("text", "") if done else delta_text
        counts: dict[str, int] = {}
        for f in incoming:
            kind = f["frame"].get("type", "<no type>")
            counts[kind] = counts.get(kind, 0) + 1
        log = [
            {
                "t_from_end": rel(f["t"], end),
                "dir": f["dir"],
                **f["frame"],
            }
            for f in self.frames
        ]
        out: dict[str, Any] = {
            "model": self.model,
            "clip": self.clip,
            "delay_ms": self.delay_ms,
            "flush": self.flush,
            "bias": self.bias,
            "raw_session": self.raw_session,
            "audio_s": round(self.audio_s, 2),
            "connect_s": round(self.connect_s, 3),
            "first_delta_from_start_s": rel(deltas[0]["t"], self.first_send) if deltas else None,
            "first_delta_from_end_s": rel(deltas[0]["t"], end) if deltas else None,
            "first_delta_after_end_s": rel(first_after_end, end),
            "last_delta_from_end_s": rel(deltas[-1]["t"], end) if deltas else None,
            "done_from_end_s": rel(done["t"], end) if done else None,
            "done_from_end_signal_s": rel(done["t"], self.end_sent) if done else None,
            "share_of_text_before_end": round(len(text_before_end) / len(delta_text), 2) if delta_text else None,
            "final_text": final_text,
            "deltas_match_final": delta_text.strip() == final_text.strip(),
            "languages": [
                f["frame"].get("audio_language") for f in incoming if f["frame"].get("type") == "transcription.language"
            ],
            "turn_events": [
                {"t_from_start": rel(f["t"], self.first_send), **f["frame"]}
                for f in incoming
                if str(f["frame"].get("type", "")).startswith("turn.")
            ],
            "done_language": done["frame"].get("language") if done else None,
            "dones": [
                {"t_from_end": rel(f["t"], end), "text": f["frame"].get("text")}
                for f in incoming
                if f["frame"].get("type") == "transcription.done"
            ],
            "server_session": next(
                (f["frame"]["session"] for f in reversed(incoming) if f["frame"].get("type") == "session.updated"), None
            ),
            "event_counts": counts,
            "error": self.error,
            "handshake": self.handshake,
            "log": log,
        }
        if done:
            out["done_usage"] = done["frame"].get("usage")
            out["done_keys"] = sorted(done["frame"].keys())
        if reference is not None:
            from common import wer

            out["wer"] = round(wer(reference, final_text), 3)
        return out


async def _send_clip(connection: RealtimeConnection, pcm: bytes, flush: bool, result: SessionResult) -> None:
    """Send 100 ms chunks on a fixed real-time schedule, then flush (optional) and end."""
    start = time.perf_counter()
    result.first_send = start
    for index, offset in enumerate(range(0, len(pcm), CHUNK_BYTES)):
        wait = start + index * CHUNK_MS / 1000 - time.perf_counter()
        if wait > 0:
            await asyncio.sleep(wait)
        await connection.send_audio(pcm[offset : offset + CHUNK_BYTES])
    result.last_send = time.perf_counter()
    if flush:
        await connection.flush_audio()
    await connection.end_audio()
    result.end_sent = time.perf_counter()


async def run_session(
    client: Mistral,
    model: str,
    clip: str,
    pcm: bytes,
    *,
    delay_ms: int | None = None,
    flush: bool = True,
    bias: list[str] | None = None,
    turn_detection: dict[str, Any] | None = None,
    stop_at_done: bool = True,
    tail_timeout_s: float = 15.0,
) -> SessionResult:
    """One realtime session: connect, optionally send raw session fields the SDK lacks, stream, wait for done."""
    raw_session: dict[str, Any] = {}
    if bias is not None:
        raw_session["context_bias"] = bias
    if turn_detection is not None:
        raw_session["turn_detection"] = turn_detection
    result = SessionResult(
        model=model,
        clip=clip,
        delay_ms=delay_ms,
        flush=flush,
        bias=bias,
        audio_s=pcm_seconds(pcm),
        raw_session=raw_session or None,
    )
    t0 = time.perf_counter()
    connection = await client.audio.realtime.connect(
        model=model, audio_format=AUDIO_FORMAT, target_streaming_delay_ms=delay_ms
    )
    result.connect_s = time.perf_counter() - t0
    result.handshake = [ev.model_dump(by_alias=True, mode="json") for ev in connection._initial_events]
    # Tap the socket. The SDK already sent its session.update (format and delay) inside connect().
    connection._websocket = Tap(connection._websocket, result.frames)
    async with connection:
        if raw_session:
            # SDK 3.0.0 has no context_bias or turn_detection field; send the raw frame the server accepts.
            await connection._websocket.send(json.dumps({"type": "session.update", "session": raw_session}))
        sender = asyncio.create_task(_send_clip(connection, pcm, flush, result))
        try:
            async with asyncio.timeout(result.audio_s + tail_timeout_s):
                async for event in connection:
                    if isinstance(event, RealtimeTranscriptionError):
                        # Recorded, not fatal: an error on a bias update should not hide the transcript.
                        result.error = json.dumps(event.model_dump(by_alias=True, mode="json"))
                    if isinstance(event, UnknownRealtimeEvent) and event.type is None:
                        result.error = f"unknown frame: {event.error}"
                    if getattr(event, "type", None) == "transcription.done" and stop_at_done:
                        break
        except TimeoutError:
            result.error = (result.error or "") + " timeout waiting for transcription.done"
        except websockets.exceptions.ConnectionClosed as exc:
            # Seen when reading past transcription.done: the server drops the socket without a close frame.
            result.error = (result.error or "") + f" socket closed: {exc}"
        finally:
            if not sender.done():
                sender.cancel()
            await asyncio.gather(sender, return_exceptions=True)
    return result
