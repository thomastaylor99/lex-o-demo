"""Shared setup for the TTS spike: client, test texts, paths, WAV helpers.

The API key is read from the repo `.env` and never printed.
"""

from __future__ import annotations

import base64
import re
import struct
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from dotenv import dotenv_values
from mistralai.client import Mistral

SPIKE_DIR = Path(__file__).resolve().parent
REPO_ROOT = SPIKE_DIR.parents[1]
SAMPLES_DIR = SPIKE_DIR / "samples"
TMP_DIR = Path("/tmp/loreal-tts-spike")  # raw PCM goes here, never into the repo

# `voxtral-mini-tts-latest` is an alias of `voxtral-mini-tts-2603` (models.list, 2026-10-04).
MODELS = ["voxtral-mini-tts-2603", "voxtral-mini-tts-3"]

TEXTS = {
    "en_short": "Welcome! Tell me a little about your skin.",  # 8 words
    "en_medium": (
        "Thanks for sharing that. I would start with this gentle serum, "
        "then apply your usual moisturiser every morning and evening."
    ),  # 20 words
    "fr_medium": (
        "Merci pour ces précisions. Je commencerais par ce sérum doux, "
        "puis votre crème hydratante habituelle, chaque matin et chaque soir."
    ),  # 20 words
}

LINE_EN = "Based on what you told me, this cream is my top pick for your dry, sensitive skin."
LINE_FR = (
    "D'après ce que vous m'avez dit, cette crème est mon premier choix "
    "pour votre peau sèche et sensible."
)


def api_key() -> str:
    key = dotenv_values(REPO_ROOT / ".env").get("MISTRAL_API_KEY")
    if not key:
        raise SystemExit("MISTRAL_API_KEY missing from .env")
    return key


def make_client() -> Mistral:
    return Mistral(api_key=api_key())


@dataclass(frozen=True)
class WavInfo:
    audio_format: int  # 1 = integer PCM, 3 = IEEE float
    channels: int
    sample_rate: int
    bits_per_sample: int
    data_bytes: int

    @property
    def duration_s(self) -> float:
        frame = self.channels * self.bits_per_sample // 8
        return self.data_bytes / frame / self.sample_rate


def parse_wav(raw: bytes) -> WavInfo:
    """Read the RIFF header by hand: the stdlib `wave` module rejects float WAVs."""
    if raw[:4] != b"RIFF" or raw[8:12] != b"WAVE":
        raise ValueError(f"not a RIFF/WAVE file: {raw[:12]!r}")
    pos, fmt, data_bytes = 12, None, None
    while pos + 8 <= len(raw):
        chunk_id, size = raw[pos : pos + 4], struct.unpack("<I", raw[pos + 4 : pos + 8])[0]
        if chunk_id == b"fmt ":
            fmt = struct.unpack("<HHIIHH", raw[pos + 8 : pos + 24])
        elif chunk_id == b"data":
            data_bytes = min(size, len(raw) - pos - 8)
            break
        pos += 8 + size + (size % 2)
    if fmt is None or data_bytes is None:
        raise ValueError("fmt or data chunk missing")
    audio_format, channels, sample_rate, _byte_rate, _align, bits = fmt
    return WavInfo(audio_format, channels, sample_rate, bits, data_bytes)


def write_wav_int16(path: Path, samples: np.ndarray, sample_rate: int) -> None:
    """Write mono float samples in [-1, 1] as a 16-bit WAV."""
    import wave

    pcm16 = (np.clip(samples, -1.0, 1.0) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(sample_rate)
        out.writeframes(pcm16.tobytes())


def b64(data: str) -> bytes:
    return base64.b64decode(data)


def lead_silence_ms(samples: np.ndarray, sample_rate: int, threshold_db: float = -40.0) -> float:
    """Milliseconds before the first 10 ms frame whose RMS exceeds the threshold (dBFS)."""
    frame = sample_rate // 100
    frames = samples[: len(samples) // frame * frame].reshape(-1, frame)
    rms_db = 20 * np.log10(np.sqrt((frames.astype(np.float64) ** 2).mean(axis=1)) + 1e-9)
    loud = np.nonzero(rms_db > threshold_db)[0]
    return float(loud[0] * 10) if loud.size else float(len(frames) * 10)


def wav_samples(raw: bytes) -> tuple[np.ndarray, int]:
    """Mono float samples in [-1, 1] from a 16-bit WAV."""
    info = parse_wav(raw)
    start = raw.index(b"data") + 8
    data = np.frombuffer(raw[start : start + info.data_bytes], dtype="<i2")
    return data.astype(np.float32) / 32768, info.sample_rate


STT_MODEL = "voxtral-mini-latest"


def transcribe(client: Mistral, audio: bytes, file_name: str) -> tuple[str, str | None]:
    """Voxtral transcription with no language hint: (text, detected language)."""
    res = client.audio.transcriptions.complete(
        model=STT_MODEL, file={"file_name": file_name, "content": audio}
    )
    return res.text.strip(), res.language


def words(text: str) -> list[str]:
    text = text.lower().replace("’", "'").replace("'", " ")
    return re.sub(r"[^\w\s]", " ", text).split()


def wer(reference: str, hypothesis: str) -> float:
    """Word error rate: word-level edit distance over the reference length."""
    ref, hyp = words(reference), words(hypothesis)
    row = list(range(len(hyp) + 1))
    for i, r in enumerate(ref, 1):
        prev, row[0] = row[0], i
        for j, h in enumerate(hyp, 1):
            prev, row[j] = row[j], min(row[j] + 1, row[j - 1] + 1, prev + (r != h))
    return row[-1] / len(ref)
