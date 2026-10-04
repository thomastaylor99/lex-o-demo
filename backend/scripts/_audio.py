"""Laptop audio for the terminal voice client (task T24): microphone, speaker and a simple VAD.

sounddevice is imported only when a device opens, so a muted text-mode run never loads PortAudio.
Audio stays in memory.
"""

import asyncio
import threading
import time
from typing import Any

import numpy as np

MIC_RATE = 16_000  # realtime speech to text takes 16 kHz mono int16
FRAME_MS = 20
FRAME_SAMPLES = MIC_RATE * FRAME_MS // 1000
SPEAKER_RATE = 24_000  # speech arrives as 24 kHz mono float32
SPEAKER_BYTES_PER_S = SPEAKER_RATE * 4
DEFAULT_VAD_THRESHOLD = 500.0  # int16 RMS, the value the Decathlon terminal client used
_PAUSED = b""  # queued by Mic.pause(): every frame captured before it is already queued


class Mic:
    """The default microphone at 16 kHz, mono, int16, in 20 ms frames on an asyncio queue.

    The stream runs from `start` to `stop`; while paused, its frames are dropped.
    """

    def __init__(self) -> None:
        self.queue: asyncio.Queue[bytes] = asyncio.Queue()
        self._paused = True
        self._loop: asyncio.AbstractEventLoop | None = None
        self._stream: Any = None

    def start(self) -> None:
        import sounddevice as sd

        self._loop = asyncio.get_running_loop()
        self._stream = sd.RawInputStream(
            samplerate=MIC_RATE,
            blocksize=FRAME_SAMPLES,
            channels=1,
            dtype="int16",
            callback=self._callback,
        )
        self._stream.start()

    def stop(self) -> None:
        self.pause()
        if self._stream is not None:
            self._stream.close()
            self._stream = None

    def pause(self) -> None:
        """Drop new frames. A reader still gets the frames already queued, then None."""
        if not self._paused:
            self._paused = True
            self.queue.put_nowait(_PAUSED)

    def resume(self) -> None:
        """Forget anything queued before, and take frames again."""
        while not self.queue.empty():
            self.queue.get_nowait()
        self._paused = False

    async def read(self) -> bytes | None:
        """The next frame, or None once the mic is paused and its queued frames are read."""
        frame = await self.queue.get()
        return frame or None

    @property
    def lag_s(self) -> float:
        """Seconds of audio captured and not read yet."""
        return self.queue.qsize() * FRAME_MS / 1000

    def _callback(self, indata: Any, frames: int, time_info: Any, status: Any) -> None:
        if self._loop is None:
            return
        try:
            self._loop.call_soon_threadsafe(self._push, bytes(indata))
        except RuntimeError:  # the event loop closed during shutdown
            pass

    def _push(self, frame: bytes) -> None:
        if not self._paused:
            self.queue.put_nowait(frame)


class Speaker:
    """The default output at 24 kHz, mono, float32, played from a buffer the audio thread drains.

    `play` returns at once and chunks play back to back. `first_sound_at` is the monotonic time
    the first audio queued after `mark_turn` reaches the speaker. Muted, no device opens and a
    clock stands in for it, so `first_sound_at` and `drained` behave as if the audio played.
    """

    def __init__(self, *, muted: bool = False) -> None:
        self.muted = muted
        self._lock = threading.Lock()
        self._buffer = bytearray()
        self._queued = 0  # bytes ever queued
        self._played = 0  # bytes ever handed to the device, or dropped by clear()
        self._mark: int | None = None
        self._first_sound_at: float | None = None
        self._ends_at = 0.0  # monotonic time the last audio handed over finishes playing
        self._latency = 0.0
        self._stream: Any = None

    def start(self) -> None:
        if self.muted:
            return
        import sounddevice as sd

        self._stream = sd.RawOutputStream(
            samplerate=SPEAKER_RATE, channels=1, dtype="float32", callback=self._callback
        )
        self._latency = float(self._stream.latency)
        self._stream.start()

    def stop(self) -> None:
        self.clear()
        if self._stream is not None:
            self._stream.close()
            self._stream = None

    def play(self, pcm: bytes) -> None:
        with self._lock:
            if self.muted:
                self._play_muted(len(pcm))
            else:
                self._buffer += pcm
            self._queued += len(pcm)

    def mark_turn(self) -> None:
        """Start timing a turn: `first_sound_at` waits for the next audio queued."""
        with self._lock:
            self._mark = self._queued
            self._first_sound_at = None

    @property
    def first_sound_at(self) -> float | None:
        with self._lock:
            return self._first_sound_at

    def clear(self) -> None:
        """Drop the audio not played yet."""
        with self._lock:
            self._played += len(self._buffer)
            self._buffer.clear()
            self._ends_at = min(self._ends_at, time.monotonic())

    async def drained(self) -> None:
        """Return once everything queued has played."""
        while True:
            with self._lock:
                left = max(
                    len(self._buffer) / SPEAKER_BYTES_PER_S, self._ends_at - time.monotonic()
                )
            if left <= 0 or not (self.muted or self._active()):
                return
            await asyncio.sleep(min(left, 0.05))

    def _active(self) -> bool:
        return self._stream is not None and bool(self._stream.active)

    def _play_muted(self, size: int) -> None:
        """Advance the stand-in clock as if the chunk played after the audio queued before it."""
        start = max(time.monotonic(), self._ends_at)
        if self._first_sound_at is None and self._mark is not None and self._queued >= self._mark:
            self._first_sound_at = start
        self._ends_at = start + size / SPEAKER_BYTES_PER_S

    def _callback(self, outdata: Any, frames: int, time_info: Any, status: Any) -> None:
        now = time.monotonic()
        delay = time_info.outputBufferDacTime - time_info.currentTime
        if not 0.0 <= delay < 1.0:  # the host gave no usable DAC time
            delay = self._latency
        size = len(outdata)
        with self._lock:
            take = min(size, len(self._buffer) - len(self._buffer) % 4)  # whole samples only
            if take:
                outdata[:take] = self._buffer[:take]
                del self._buffer[:take]
                start = self._played
                self._played += take
                if (
                    self._first_sound_at is None
                    and self._mark is not None
                    and self._played > self._mark
                ):
                    offset = max(0, self._mark - start)  # bytes before the turn's first audio
                    self._first_sound_at = now + delay + offset / SPEAKER_BYTES_PER_S
                self._ends_at = now + delay + take / SPEAKER_BYTES_PER_S
        if take < size:
            outdata[take:] = bytes(size - take)  # silence


class Vad:
    """Voice activity from loudness. Speech starts after `start_ms` of frames at or over
    `threshold` (int16 RMS), so a click does not count, and ends after `end_ms` under it.
    """

    def __init__(
        self, threshold: float = DEFAULT_VAD_THRESHOLD, *, start_ms: int = 60, end_ms: int = 600
    ) -> None:
        self.threshold = threshold
        self._start_frames = max(1, start_ms // FRAME_MS)
        self._end_frames = max(1, end_ms // FRAME_MS)
        self.reset()

    def reset(self) -> None:
        self.started = False
        self.ended = False
        self._loud = 0
        self._quiet = 0

    def feed(self, frame: bytes) -> bool:
        """Take one frame; True when it is voiced."""
        voiced = rms(frame) >= self.threshold
        if voiced:
            self._loud += 1
            self._quiet = 0
            if self._loud >= self._start_frames:
                self.started = True
        else:
            self._loud = 0
            if self.started:
                self._quiet += 1
                if self._quiet >= self._end_frames:
                    self.ended = True
        return voiced


def rms(frame: bytes) -> float:
    """Root mean square of int16 samples, in int16 units."""
    samples = np.frombuffer(frame, dtype="<i2").astype(np.float64)
    return float(np.sqrt(np.mean(samples * samples))) if samples.size else 0.0
