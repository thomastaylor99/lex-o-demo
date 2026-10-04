"""Live check of speech to text: two sentences with brand names, synthesised, then streamed at
real-time pace through MistralTranscriber with a context_bias list.

Run from backend/: uv run python -m scripts.smoke_stt
Prints the text, the detected language and the time from `end` to the final text.
"""

import asyncio
import time

import numpy as np
from mistralai.client import Mistral

from app.logging import configure_logging
from app.settings import Settings
from app.voice.language import detect
from app.voice.stt import MistralTranscriber, TranscriptionStream
from app.voice.tts import MistralSynthesizer

CONTEXT_BIAS = [
    "La Roche-Posay",
    "Toleriane",
    "CeraVe",
    "Lancôme",
    "Hydra Zen",
    "Kiehl's",
    "Vichy",
    "Minéral 89",
    "Garnier",
]
JANE_CONFIDENT = "cbe96cf0-85ec-4a10-accb-0b35c93b6dfd"
MARIE_NEUTRAL = "5a271406-039d-46fe-835b-fbbb00eaf08d"
SENTENCES = [
    ("en", JANE_CONFIDENT, "Is La Roche-Posay Toleriane richer than CeraVe or Kiehl's?"),
    (
        "fr",
        MARIE_NEUTRAL,
        "Je préfère Lancôme Hydra Zen, sinon le Minéral 89 de Vichy ou une crème Garnier.",
    ),
]
CHUNK_S = 0.1
CHUNK_BYTES = 3200  # 100 ms of 16 kHz int16
LEAD_IN = bytes(2 * 4800)  # 0.3 s of silence before the speech, as in the STT spike


def to_16k_int16(pcm: bytes) -> bytes:
    """24 kHz float32 to 16 kHz int16, by linear interpolation."""
    samples = np.frombuffer(pcm, dtype="<f4")
    positions = np.arange(0, len(samples) - 1, 1.5)
    resampled = np.interp(positions, np.arange(len(samples)), samples)
    return (np.clip(resampled, -1.0, 1.0) * 32767).astype("<i2").tobytes()


async def send_at_real_time_pace(stream: TranscriptionStream, pcm: bytes) -> float:
    """Send 100 ms chunks on a fixed schedule, then `end`; returns the time `end` was sent."""
    started = time.perf_counter()
    for index, offset in enumerate(range(0, len(pcm), CHUNK_BYTES)):
        await asyncio.sleep(max(0.0, started + index * CHUNK_S - time.perf_counter()))
        await stream.send(pcm[offset : offset + CHUNK_BYTES])
    end_at = time.perf_counter()
    await stream.end()
    return end_at


async def transcribe(transcriber: MistralTranscriber, pcm: bytes) -> tuple[str, float]:
    """The final text, and the seconds from `end` to it."""
    stream = await transcriber.open()
    sender = asyncio.create_task(send_at_real_time_pace(stream, pcm))
    try:
        events = [event async for event in stream.events()]  # the last one is the final text
        done_at = time.perf_counter()
        return events[-1].text, done_at - await sender
    finally:
        sender.cancel()
        await stream.close()


async def main() -> None:
    configure_logging()
    settings = Settings()
    async with Mistral(api_key=settings.mistral_api_key) as client:
        synthesizer = MistralSynthesizer(
            client, settings.tts_model, settings.tts_first_chunk_timeout_s
        )
        transcriber = MistralTranscriber(
            client, settings.stt_model, settings.stt_streaming_delay_ms, CONTEXT_BIAS
        )
        for language, voice_id, sentence in SENTENCES:
            pcm = LEAD_IN + to_16k_int16(await synthesizer.synthesize(sentence, voice_id))
            text, final_s = await transcribe(transcriber, pcm)
            detected = detect(text, default="fr" if language == "en" else "en")  # a tie shows
            missing = [name for name in CONTEXT_BIAS if name in sentence and name not in text]
            print(f"said:     {sentence}")
            print(f"heard:    {text}")
            print(f"language: {detected} (spoken in {language})")
            print(f"final:    {final_s:.2f} s after end")
            print(f"names:    {'all right' if not missing else 'missing ' + ', '.join(missing)}")


if __name__ == "__main__":
    asyncio.run(main())
