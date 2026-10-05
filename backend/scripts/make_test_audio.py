"""Make the visitor utterances the live pipeline test speaks (tests/golden/test_live_pipeline.py).

Run from backend/: uv run python -m scripts.make_test_audio
Synthesises each line with the app's TTS (model from settings, the concierge's voice for that
language) and writes it as the browser would capture it: 16 kHz mono 16-bit PCM, with a short
silence before and after, to tests/fixtures/audio/visitor_<language>.wav. The root .gitignore
ignores *.wav, so a fresh clone runs this once before `pytest -m golden`.
"""

import asyncio
import wave
from pathlib import Path

import numpy as np
from mistralai.client import Mistral

from app.agents.voices import CONCIERGE_VOICES
from app.lang import Language
from app.logging import configure_logging
from app.settings import Settings
from app.voice.tts import MistralSynthesizer

OUT_DIR = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "audio"
LINES: dict[Language, str] = {
    "en": "Hi, I'm looking for a moisturiser, my skin has been feeling really tight lately.",
    "fr": "Bonjour, je cherche une crème hydratante, ma peau tiraille beaucoup en ce moment.",
}
TTS_RATE = 24_000  # float32 mono from the TTS
WAV_RATE = 16_000  # int16 mono, what the browser sends to /ws/transcribe
LEAD_IN_S = 0.3  # the mic is open a moment before the visitor speaks
TAIL_S = 0.5  # and released a moment after
CUTOFF_HZ = 7_600  # just under the 8 kHz Nyquist of the output
TAPS = 101


def to_16k_int16(pcm: bytes) -> bytes:
    """24 kHz float32 to 16 kHz int16: upsample by 2, low-pass, keep every third sample."""
    samples = np.frombuffer(pcm, dtype="<f4").astype(np.float64)
    upsampled = np.zeros(len(samples) * 2)
    upsampled[::2] = samples * 2  # the inserted zeros halve the level
    offsets = np.arange(TAPS) - TAPS // 2
    cutoff = CUTOFF_HZ / (2 * TTS_RATE)  # in cycles per sample at 48 kHz
    kernel = np.sinc(2 * cutoff * offsets) * np.hamming(TAPS)
    filtered = np.convolve(upsampled, kernel / kernel.sum(), mode="same")
    return (np.clip(filtered[::3], -1.0, 1.0) * 32767).astype("<i2").tobytes()


def silence(seconds: float) -> bytes:
    return bytes(2 * round(WAV_RATE * seconds))


def write_wav(path: Path, pcm: bytes) -> None:
    with wave.open(str(path), "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(WAV_RATE)
        out.writeframes(pcm)


async def main() -> None:
    configure_logging()
    settings = Settings()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    async with Mistral(api_key=settings.mistral_api_key) as client:
        synthesizer = MistralSynthesizer(
            client,
            settings.tts_model,
            settings.tts_first_chunk_timeout_s,
            hedge_after_s=settings.tts_hedge_after_s,
            max_attempts=settings.tts_max_attempts,
        )
        for language, text in LINES.items():
            speech = await synthesizer.synthesize(text, CONCIERGE_VOICES[language])
            pcm = silence(LEAD_IN_S) + to_16k_int16(speech) + silence(TAIL_S)
            path = OUT_DIR / f"visitor_{language}.wav"
            write_wav(path, pcm)
            print(f"{path.name}: {len(pcm) / 2 / WAV_RATE:.1f} s, {len(pcm) // 1024} KiB")


if __name__ == "__main__":
    asyncio.run(main())
