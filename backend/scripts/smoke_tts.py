"""Live check of speech output: one English and one French sentence in two voices.

Run from backend/: uv run python -m scripts.smoke_tts
Prints the time to the first chunk and the total for each, and writes WAVs to /tmp/lex-smoke-tts/.
The sentences are the TTS spike's 20-word ones, so the timings compare with its table.
"""

import asyncio
import time
import wave
from pathlib import Path

import numpy as np
from mistralai.client import Mistral

from app.logging import configure_logging
from app.settings import Settings
from app.voice.tts import MistralSynthesizer

OUT_DIR = Path("/tmp/lex-smoke-tts")
SAMPLE_RATE = 24_000
VOICES = {
    "gb_jane_confident": "cbe96cf0-85ec-4a10-accb-0b35c93b6dfd",
    "gb_oliver_cheerful": "5ad5d44e-6b4e-4a57-a8a8-4cae088034ed",
}
SENTENCES = {
    "en": "Thanks for sharing that. I would start with this gentle serum, "
    "then apply your usual moisturiser every morning and evening.",
    "fr": "Merci pour ces précisions. Je commencerais par ce sérum doux, "
    "puis votre crème hydratante habituelle, chaque matin et chaque soir.",
}


def ms_since(started: float) -> int:
    return round((time.perf_counter() - started) * 1000)


def write_wav(path: Path, pcm: bytes) -> None:
    """Float32 PCM to a 16-bit WAV."""
    samples = np.clip(np.frombuffer(pcm, dtype="<f4"), -1.0, 1.0)
    with wave.open(str(path), "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(SAMPLE_RATE)
        out.writeframes((samples * 32767).astype("<i2").tobytes())


async def speak(synthesizer: MistralSynthesizer, voice: str, language: str, text: str) -> None:
    started = time.perf_counter()
    first_ms: int | None = None
    chunks: list[bytes] = []
    async for chunk in synthesizer.stream(text, VOICES[voice]):
        first_ms = first_ms or ms_since(started)
        chunks.append(chunk)
    total_ms = ms_since(started)
    pcm = b"".join(chunks)
    path = OUT_DIR / f"{voice}__{language}.wav"
    write_wav(path, pcm)
    audio_s = len(pcm) / 4 / SAMPLE_RATE
    print(
        f"{voice} {language}: first chunk {first_ms} ms, total {total_ms} ms, "
        f"{audio_s:.1f} s of audio, {path}"
    )


async def main() -> None:
    configure_logging()
    settings = Settings()
    async with Mistral(api_key=settings.mistral_api_key) as client:
        synthesizer = MistralSynthesizer(
            client, settings.tts_model, settings.tts_first_chunk_timeout_s
        )
        started = time.perf_counter()
        await synthesizer.synthesize("Hello.", VOICES["gb_jane_confident"])
        print(f"warm-up on a fresh connection, as LineCache.warm does: {ms_since(started)} ms")
        for voice in VOICES:
            for language, text in SENTENCES.items():
                await speak(synthesizer, voice, language, text)


if __name__ == "__main__":
    OUT_DIR.mkdir(exist_ok=True)
    asyncio.run(main())
