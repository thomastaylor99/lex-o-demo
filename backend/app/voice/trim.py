"""Drop the silence a voice puts before its first word, as the PCM stream arrives.

float32 little-endian samples; anything under -40 dBFS (0.01) before the first word is silence.
About 20 ms before the onset is kept so the first consonant is not clipped. If no word comes
within `max_silence_s`, the audio passes untouched: a very soft voice is never swallowed.
"""

from array import array

RATE = 24_000
THRESHOLD = 0.01
KEEP_S = 0.02


class LeadingSilenceTrimmer:
    def __init__(self, max_silence_s: float = 0.6) -> None:
        self._held = bytearray()
        self._done = False
        self._max_bytes = int(max_silence_s * RATE) * 4

    def feed(self, chunk: bytes) -> bytes:
        """The audio to play now: nothing while only silence has arrived, then everything."""
        if self._done:
            return chunk
        self._held += chunk
        aligned = len(self._held) // 4 * 4
        samples = array("f", bytes(self._held[:aligned]))
        onset = next((i for i, x in enumerate(samples) if abs(x) >= THRESHOLD), None)
        if onset is None and len(self._held) < self._max_bytes:
            return b""
        start = 0 if onset is None else max(0, onset - int(KEEP_S * RATE)) * 4
        self._done = True
        out = bytes(self._held[start:])
        self._held.clear()
        return out

    def flush(self) -> bytes:
        """Whatever is still held when the stream ends (a reply that is all silence)."""
        out = bytes(self._held)
        self._held.clear()
        self._done = True
        return out
