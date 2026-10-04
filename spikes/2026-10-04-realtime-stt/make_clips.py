"""Generate the test clips with TTS and store them as 16 kHz mono s16le PCM in /tmp/rtstt/clips.

Run from anywhere:
    uv run --with "mistralai[realtime]==3.0.0" --with numpy --with python-dotenv python make_clips.py
"""

from __future__ import annotations

import asyncio
import base64
import json
import math
import struct
import time
import wave

import numpy as np
from mistralai.client import Mistral

from common import (
    CLIPS,
    CLIPS_DIR,
    SAMPLE_RATE,
    SWITCH_GAP_S,
    SWITCH_NAME,
    SWITCH_PARTS,
    TTS_MODEL,
    clip_path,
    load_api_key,
    pcm_seconds,
    silence,
)

LEAD_S = 0.3  # silence prepended, like a mic that opens before the visitor speaks
SPEECH_DB = -30.0  # frames within this of the loudest frame count as speech


def parse_wav(data: bytes) -> tuple[np.ndarray, int, str]:
    """Return mono float samples in [-1, 1], the sample rate and a format description."""
    if data[:4] != b"RIFF" or data[8:12] != b"WAVE":
        raise ValueError("not a RIFF/WAVE payload")
    pos, fmt, body = 12, b"", b""
    while pos + 8 <= len(data):
        chunk_id = data[pos : pos + 4]
        size = int.from_bytes(data[pos + 4 : pos + 8], "little")
        if chunk_id == b"data":
            end = len(data) if size in (0, 0xFFFFFFFF) or pos + 8 + size > len(data) else pos + 8 + size
            body = data[pos + 8 : end]
            break
        if chunk_id == b"fmt ":
            fmt = data[pos + 8 : pos + 8 + size]
        pos += 8 + size + (size & 1)
    audio_format, channels, rate = struct.unpack("<HHI", fmt[:8])
    bits = struct.unpack("<H", fmt[14:16])[0]
    if audio_format == 0xFFFE:  # WAVE_FORMAT_EXTENSIBLE: real format in the sub-format GUID
        audio_format = struct.unpack("<H", fmt[24:26])[0]
    if audio_format == 1 and bits == 16:
        samples = np.frombuffer(body[: len(body) // 2 * 2], dtype="<i2").astype(np.float64) / 32768.0
    elif audio_format == 1 and bits == 32:
        samples = np.frombuffer(body[: len(body) // 4 * 4], dtype="<i4").astype(np.float64) / 2**31
    elif audio_format == 3 and bits == 32:
        samples = np.frombuffer(body[: len(body) // 4 * 4], dtype="<f4").astype(np.float64)
    else:
        raise ValueError(f"unsupported WAV format {audio_format} with {bits} bits")
    if channels > 1:
        samples = samples[: len(samples) // channels * channels].reshape(-1, channels).mean(axis=1)
    return samples, rate, f"format={audio_format} bits={bits} channels={channels} rate={rate}"


def resample(x: np.ndarray, src: int, dst: int) -> np.ndarray:
    """Rational resampling: zero-stuff by L, Kaiser-windowed sinc low-pass, keep every M-th sample."""
    if src == dst:
        return x
    g = math.gcd(src, dst)
    up, down = dst // g, src // g
    stuffed = np.zeros(len(x) * up)
    stuffed[::up] = x * up
    fs_up = src * up
    cutoff = 0.5 * min(src, dst) * 0.94
    taps = 64 * max(up, down) + 1
    n = np.arange(taps) - (taps - 1) / 2
    h = 2 * cutoff / fs_up * np.sinc(2 * cutoff / fs_up * n) * np.kaiser(taps, 8.6)
    return np.convolve(stuffed, h, mode="same")[::down]


def tail_gap_s(x: np.ndarray, rate: int) -> float:
    """Seconds between the last speech frame and the end of the clip (TTS output is already tight)."""
    frame = rate // 100
    n_frames = len(x) // frame
    rms = np.sqrt(np.mean(x[: n_frames * frame].reshape(n_frames, frame) ** 2, axis=1) + 1e-12)
    voiced = np.flatnonzero(rms > rms.max() * 10 ** (SPEECH_DB / 20))
    return float((len(x) - (voiced[-1] + 1) * frame) / rate)


def to_pcm16(x: np.ndarray) -> bytes:
    peak = np.max(np.abs(x))
    if peak > 0.99:  # avoid clipping after resampling overshoot
        x = x * (0.99 / peak)
    return np.round(x * 32767).astype("<i2").tobytes()


def write_wav_copy(name: str, pcm: bytes) -> None:
    """A listenable copy, kept in /tmp next to the PCM."""
    with wave.open(str(CLIPS_DIR / f"{name}.wav"), "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(SAMPLE_RATE)
        out.writeframes(pcm)


async def main() -> None:
    CLIPS_DIR.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, dict[str, object]] = {}
    raw: dict[str, bytes] = {}
    async with Mistral(api_key=load_api_key()) as client:
        for clip in CLIPS:
            t0 = time.perf_counter()
            speech = await client.audio.speech.complete_async(
                model=TTS_MODEL, input=clip.text, voice_id=clip.voice, response_format="wav"
            )
            tts_s = time.perf_counter() - t0
            samples, rate, desc = parse_wav(base64.b64decode(speech.audio_data))
            resampled = resample(samples, rate, SAMPLE_RATE)
            speech_pcm = to_pcm16(resampled)
            raw[clip.name] = speech_pcm
            pcm = silence(LEAD_S) + speech_pcm
            clip_path(clip.name).write_bytes(pcm)
            write_wav_copy(clip.name, pcm)
            manifest[clip.name] = {
                "voice": clip.voice,
                "tts_wav": desc,
                "lead_silence_s": LEAD_S,
                "speech_end_to_clip_end_s": round(tail_gap_s(resampled, SAMPLE_RATE), 2),
                "pcm_seconds": round(pcm_seconds(pcm), 2),
                "tts_request_s": round(tts_s, 2),
            }
            print(clip.name, manifest[clip.name])

    first, second = SWITCH_PARTS
    switch = silence(LEAD_S) + raw[first] + silence(SWITCH_GAP_S) + raw[second]
    clip_path(SWITCH_NAME).write_bytes(switch)
    write_wav_copy(SWITCH_NAME, switch)
    manifest[SWITCH_NAME] = {
        "parts": list(SWITCH_PARTS),
        "gap_s": SWITCH_GAP_S,
        "pcm_seconds": round(pcm_seconds(switch), 2),
    }
    print(SWITCH_NAME, manifest[SWITCH_NAME])
    (CLIPS_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
