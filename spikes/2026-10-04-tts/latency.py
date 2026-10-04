"""Time TTS per model and text: WAV non-streamed (total) vs PCM streamed (first chunk, total).

Run: uv run --with "mistralai==3.0.0" --with python-dotenv --with numpy python latency.py
Phases: one cold call per model on a fresh client; RUNS rounds over model x text x format;
TAIL_RUNS extra streamed requests per model to see how often first audio is slow;
one-off mp3 and streamed-wav requests. Writes latency_results.json and samples/latency__*.wav.
Raw PCM goes to /tmp only.
"""

from __future__ import annotations

import asyncio
import json
import statistics
import struct
import time
from dataclasses import asdict, dataclass, field
from typing import Any

import httpx2 as httpx  # mistralai 3.0.0 installs httpx2; plain httpx is absent
import numpy as np
from mistralai.client import Mistral

from common import (
    MODELS,
    SAMPLES_DIR,
    SPIKE_DIR,
    TEXTS,
    TMP_DIR,
    api_key,
    b64,
    lead_silence_ms,
    make_client,
    parse_wav,
    transcribe,
    wav_samples,
    wer,
    write_wav_int16,
)

RUNS = 5
TAIL_RUNS = 20
VOICE = {"en_short": "gb_jane_confident", "en_medium": "gb_jane_confident", "fr_medium": "fr_marie_neutral"}
API_URL = "https://api.mistral.ai/v1/audio/speech"


def ms(t0: float, t1: float) -> float:
    return round((t1 - t0) * 1000, 1)


@dataclass
class Timing:
    model: str
    text: str
    mode: str  # "wav" = wav, stream=False; "<fmt>_stream" = stream=True
    run: int
    total_ms: float = 0.0
    headers_ms: float | None = None  # stream only: when complete_async returned
    first_chunk_ms: float | None = None  # stream only: first speech.audio.delta
    audio_bytes: int = 0
    audio_s: float | None = None
    lead_silence_ms: float | None = None  # silence at the start of the audio (-40 dBFS)
    prebuffer_ms: float | None = None  # stream only: buffer needed for gapless playback
    chunk_arrivals_ms: list[float] = field(default_factory=list)
    chunk_bytes: list[int] = field(default_factory=list)


async def nonstream_once(client: Mistral, model: str, text: str, run: int, fmt: str = "wav") -> tuple[Timing, bytes]:
    t0 = time.perf_counter()
    res = await client.audio.speech.complete_async(
        model=model, input=TEXTS[text], voice_id=VOICE[text], response_format=fmt, stream=False
    )
    audio = b64(res.audio_data)
    timing = Timing(model, text, fmt, run, total_ms=ms(t0, time.perf_counter()), audio_bytes=len(audio))
    if fmt == "wav":
        samples, rate = wav_samples(audio)
        timing.audio_s = round(len(samples) / rate, 2)
        timing.lead_silence_ms = lead_silence_ms(samples, rate)
    return timing, audio


async def stream_once(
    client: Mistral, model: str, text: str, run: int, fmt: str = "pcm", keep_events: bool = False
) -> tuple[Timing, bytes, list[tuple[float, Any]]]:
    t0 = time.perf_counter()
    stream = await client.audio.speech.complete_async(
        model=model, input=TEXTS[text], voice_id=VOICE[text], response_format=fmt, stream=True
    )
    timing = Timing(model, text, f"{fmt}_stream", run, headers_ms=ms(t0, time.perf_counter()))
    chunks: list[bytes] = []
    events: list[tuple[float, Any]] = []
    async with stream as event_iter:
        async for event in event_iter:
            now = ms(t0, time.perf_counter())
            if keep_events:
                events.append((now, event))
            if event.event == "speech.audio.delta":
                data = b64(event.data.audio_data)
                timing.first_chunk_ms = timing.first_chunk_ms or now
                timing.chunk_arrivals_ms.append(now)
                timing.chunk_bytes.append(len(data))
                chunks.append(data)
    timing.total_ms = ms(t0, time.perf_counter())
    audio = b"".join(chunks)
    timing.audio_bytes = len(audio)
    return timing, audio, events


def describe(at_ms: float, event: Any) -> dict[str, Any]:
    data = event.data.model_dump(by_alias=True)
    if "audio_data" in data:
        raw = data["audio_data"]
        data["audio_data"] = f"{raw[:16]}... (str, {len(raw)} base64 chars, {len(b64(raw))} bytes decoded)"
    return {
        "at_ms": at_ms,
        "python_type": type(event).__name__,
        "event": event.event,
        "data_type": type(event.data).__name__,
        "data": data,
    }


def analyse_pcm(raw: bytes) -> dict[str, Any]:
    """Int16 audio read as float32 yields NaN/Inf whenever a negative sample lands in the high half."""
    f32 = np.frombuffer(raw[: len(raw) // 4 * 4], dtype="<f4")
    i16 = np.frombuffer(raw[: len(raw) // 2 * 2], dtype="<i2").astype(np.int32)
    finite = np.isfinite(f32)
    return {
        "bytes": len(raw),
        "bytes_mod_4": len(raw) % 4,
        "as_float32le_all_finite": bool(finite.all()),
        "as_float32le_peak": round(float(np.abs(f32[finite]).max()), 4) if finite.any() else None,
        "as_int16le_peak": int(np.abs(i16).max()) if i16.size else None,
    }


def riff_fields(raw: bytes) -> dict[str, Any]:
    """Header fields as sent (unclamped), to see what a streamed WAV declares."""
    out: dict[str, Any] = {"first_4_bytes": raw[:4].decode("latin1")}
    if raw[:4] != b"RIFF":
        return out
    out["riff_size_field"] = struct.unpack("<I", raw[4:8])[0]
    pos = 12
    while pos + 8 <= len(raw):
        chunk_id, size = raw[pos : pos + 4], struct.unpack("<I", raw[pos + 4 : pos + 8])[0]
        if chunk_id == b"data":
            out |= {"data_size_field": size, "header_bytes": pos + 8}
            break
        pos += 8 + size + (size % 2)
    return out


def finish_pcm_metrics(t: Timing, audio: bytes, sample_rate: int) -> None:
    """The PCM stream is float32 little-endian mono (checked with analyse_pcm)."""
    bytes_per_s = sample_rate * 4
    samples = np.frombuffer(audio[: len(audio) // 4 * 4], dtype="<f4")
    t.audio_s = round(len(samples) / sample_rate, 2)
    t.lead_silence_ms = lead_silence_ms(samples, sample_rate)
    if t.chunk_arrivals_ms:
        first, played, worst = t.chunk_arrivals_ms[0], 0.0, 0.0
        for arrival, size in zip(t.chunk_arrivals_ms, t.chunk_bytes):
            worst = max(worst, arrival - first - played)
            played += size / bytes_per_s * 1000
        t.prebuffer_ms = round(worst, 1)


async def raw_sse(model: str) -> dict[str, Any]:
    """The same request over plain HTTP, to record the SSE wire format."""
    body = {
        "model": model, "input": TEXTS["en_short"], "voice_id": VOICE["en_short"],
        "response_format": "pcm", "stream": True,
    }
    headers = {"Authorization": f"Bearer {api_key()}", "Accept": "text/event-stream"}
    async with httpx.AsyncClient(timeout=60) as http:
        async with http.stream("POST", API_URL, json=body, headers=headers) as resp:
            lines = [line async for line in resp.aiter_lines()]
            status, ctype = resp.status_code, resp.headers.get("content-type")

    def short(line: str) -> str:
        if '"audio_data":"' not in line:
            return line
        head, rest = line.split('"audio_data":"', 1)
        data, tail = rest.split('"', 1)
        return f'{head}"audio_data":"{data[:16]}...<{len(data)} base64 chars>"{tail}'

    return {"status": status, "content_type": ctype, "lines": len(lines),
            "first_lines": [short(x) for x in lines[:7]], "last_lines": [short(x) for x in lines[-7:]]}


def med(values: list[float | None]) -> float | None:
    clean = [v for v in values if v is not None]
    return round(statistics.median(clean), 1) if clean else None


def spread(values: list[float | None]) -> dict[str, Any]:
    clean = sorted(v for v in values if v is not None)
    return {
        "n": len(clean), "p50": round(float(np.percentile(clean, 50)), 1),
        "p90": round(float(np.percentile(clean, 90)), 1), "max": clean[-1],
        "over_1000ms": sum(v > 1000 for v in clean),
    }


async def main() -> None:
    TMP_DIR.mkdir(exist_ok=True)
    runs: list[tuple[Timing, bytes]] = []
    tail: list[tuple[Timing, bytes]] = []
    event_samples: dict[str, list[dict[str, Any]]] = {}
    one_offs: list[dict[str, Any]] = []

    cold: dict[str, float] = {}
    for model in MODELS:  # fresh client each time: includes DNS, TLS and connection setup
        async with make_client() as fresh:
            t, _ = await nonstream_once(fresh, model, "en_short", -1)
            cold[model] = t.total_ms

    async with make_client() as client:
        await nonstream_once(client, MODELS[0], "en_short", -1)  # open the connection, untimed
        for run in range(RUNS):
            for model in MODELS:
                for text in TEXTS:
                    for mode in (["wav", "pcm"] if run % 2 == 0 else ["pcm", "wav"]):
                        if mode == "wav":
                            t, audio = await nonstream_once(client, model, text, run)
                        else:
                            t, audio, events = await stream_once(client, model, text, run, keep_events=run == 0)
                            if events:
                                sample = [describe(*e) for e in events[:2] + events[-2:]]
                                sample.append({"delta_events": sum(e.event == "speech.audio.delta" for _, e in events),
                                               "all_events": len(events)})
                                event_samples[f"{model}/{text}"] = sample
                        runs.append((t, audio))
                        print(f"run {run} {model} {text} {t.mode}: total {t.total_ms} ms, "
                              f"first chunk {t.first_chunk_ms} ms", flush=True)

        for run in range(TAIL_RUNS):
            for model in MODELS:
                t, audio, _ = await stream_once(client, model, "en_medium", run)
                tail.append((t, audio))
                print(f"tail {run} {model}: first chunk {t.first_chunk_ms} ms (headers {t.headers_ms})", flush=True)

        for model in MODELS:
            t, audio = await nonstream_once(client, model, "en_medium", 0, fmt="mp3")
            one_offs.append(asdict(t) | {"first_bytes_hex": audio[:4].hex()})
            for fmt in ("mp3", "wav"):
                t, audio, _ = await stream_once(client, model, "en_medium", 0, fmt=fmt)
                first = audio[: t.chunk_bytes[0]] if t.chunk_bytes else b""
                extra: dict[str, Any] = {"first_chunk_bytes": len(first), "first_bytes_hex": first[:4].hex()}
                if fmt == "wav":
                    extra |= {"first_chunk_riff": riff_fields(first)}
                one_offs.append(asdict(t) | extra)

        formats: dict[str, Any] = {}
        for model in MODELS:
            wav = next(a for t, a in runs if (t.model, t.text, t.mode) == (model, "en_medium", "wav"))
            pcm = next(a for t, a in runs if (t.model, t.text, t.mode) == (model, "en_medium", "pcm_stream"))
            info = parse_wav(wav)
            check = analyse_pcm(pcm)
            if not (check["as_float32le_all_finite"] and check["as_float32le_peak"] <= 1.0):
                raise SystemExit(f"{model}: PCM stream is not float32 in [-1, 1]: {check}")
            check["duration_s_as_float32_at_wav_rate"] = round(check["bytes"] / 4 / info.sample_rate, 2)
            for t, audio in runs + tail:
                if t.model == model and t.mode == "pcm_stream":
                    finish_pcm_metrics(t, audio, info.sample_rate)

            (TMP_DIR / f"{model}__en_medium.pcm").write_bytes(pcm)
            decoded = SAMPLES_DIR / f"latency__{model}__en_medium__from-pcm-stream.wav"
            write_wav_int16(decoded, np.frombuffer(pcm[: len(pcm) // 4 * 4], dtype="<f4"), info.sample_rate)
            text, _ = transcribe(client, decoded.read_bytes(), decoded.name)
            check["decoded_at_24khz_transcript_wer"] = round(wer(TEXTS["en_medium"], text), 2)
            for text_key in ("en_medium", "fr_medium"):
                audio = next(a for t, a in runs if (t.model, t.text, t.mode) == (model, text_key, "wav"))
                (SAMPLES_DIR / f"latency__{model}__{text_key}.wav").write_bytes(audio)
            formats[model] = {"wav_header": asdict(info) | riff_fields(wav) | {"duration_s": round(info.duration_s, 2)},
                              "pcm_check": check}

    sse = {model: await raw_sse(model) for model in MODELS}

    timings = [t for t, _ in runs]
    summary = []
    for model in MODELS:
        for text in TEXTS:
            wav = [t for t in timings if (t.model, t.text, t.mode) == (model, text, "wav")]
            pcm = [t for t in timings if (t.model, t.text, t.mode) == (model, text, "pcm_stream")]
            summary.append({
                "model": model, "text": text, "words": len(TEXTS[text].split()),
                "wav_total_ms": med([t.total_ms for t in wav]),
                "wav_total_range_ms": [min(t.total_ms for t in wav), max(t.total_ms for t in wav)],
                "wav_audio_s": med([t.audio_s for t in wav]),
                "wav_lead_silence_ms": med([t.lead_silence_ms for t in wav]),
                "pcm_first_chunk_ms": med([t.first_chunk_ms for t in pcm]),
                "pcm_first_chunk_range_ms": [min(t.first_chunk_ms or 0 for t in pcm), max(t.first_chunk_ms or 0 for t in pcm)],
                "pcm_lead_silence_ms": med([t.lead_silence_ms for t in pcm]),
                "pcm_first_sound_ms": med([(t.first_chunk_ms or 0) + (t.lead_silence_ms or 0) for t in pcm]),
                "pcm_total_ms": med([t.total_ms for t in pcm]),
                "pcm_audio_s": med([t.audio_s for t in pcm]),
                "pcm_chunks": med([len(t.chunk_bytes) for t in pcm]),
                "pcm_prebuffer_ms": med([t.prebuffer_ms for t in pcm]),
                "pcm_prebuffer_max_ms": max(t.prebuffer_ms or 0 for t in pcm),
            })

    tail_summary = {}
    for model in MODELS:
        streamed = [t for t, _ in tail if t.model == model]
        tail_summary[model] = {
            "first_chunk": spread([t.first_chunk_ms for t in streamed]),
            "headers": spread([t.headers_ms for t in streamed]),
            "total": spread([t.total_ms for t in streamed]),
            "prebuffer": spread([t.prebuffer_ms for t in streamed]),
            "lead_silence_p50": med([t.lead_silence_ms for t in streamed]),
        }

    results = {
        "date": "2026-10-04", "sdk": "mistralai 3.0.0", "runs": RUNS, "tail_runs": TAIL_RUNS,
        "voices": VOICE, "texts": TEXTS, "cold_first_call_ms": cold, "summary": summary,
        "tail_summary": tail_summary, "formats": formats, "event_samples": event_samples,
        "raw_sse": sse, "one_offs": one_offs,
        "timings": [asdict(t) for t in timings], "tail_timings": [asdict(t) for t, _ in tail],
    }
    (SPIKE_DIR / "latency_results.json").write_text(json.dumps(results, indent=2, ensure_ascii=False))

    print("\n| Model | Text | Words | Audio (s) | WAV total | PCM first chunk | PCM first sound | PCM total | Chunks | Prebuffer med/max |")
    print("|---|---|---|---|---|---|---|---|---|---|")
    for s in summary:
        print(f"| {s['model']} | {s['text']} | {s['words']} | {s['wav_audio_s']} | {s['wav_total_ms']} "
              f"{s['wav_total_range_ms']} | {s['pcm_first_chunk_ms']} {s['pcm_first_chunk_range_ms']} | "
              f"{s['pcm_first_sound_ms']} | {s['pcm_total_ms']} | {s['pcm_chunks']} | "
              f"{s['pcm_prebuffer_ms']}/{s['pcm_prebuffer_max_ms']} |")
    print("\ncold first call (fresh client):", cold)
    print(json.dumps({"tail": tail_summary, "formats": formats}, indent=1))
    for o in one_offs:
        print({k: o.get(k) for k in ("model", "mode", "total_ms", "headers_ms", "first_chunk_ms",
                                     "first_chunk_bytes", "first_bytes_hex", "first_chunk_riff")})


if __name__ == "__main__":
    asyncio.run(main())
