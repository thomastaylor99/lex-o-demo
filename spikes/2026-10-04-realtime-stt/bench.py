"""Run the realtime STT experiments and append one JSON line per session to /tmp/rtstt/results/<experiment>.jsonl.

    uv run --with "mistralai[realtime]==3.0.0" --with numpy --with python-dotenv python bench.py models
    ... bench.py delay --model voxtral-transcribe-realtime-3
    ... bench.py bias | bias_extra | switch | endonly | turn | afterdone | once --clip EN1 --model ...

Runs are sequential (one session at a time) so timings do not compete with each other.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import time
from typing import Any

from mistralai.client import Mistral

from common import (
    CLIPS,
    CLIPS_BY_NAME,
    CONTEXT_BIAS,
    MODELS,
    RESULTS_DIR,
    SINGLE_WORD_BIAS,
    SWITCH_NAME,
    SWITCH_PARTS,
    load_api_key,
    read_pcm,
    silence,
    term_hits,
)
from harness import run_session

BEST_DEFAULT = "voxtral-transcribe-realtime-3"


def reference_text(clip: str) -> str:
    if clip == SWITCH_NAME:
        return " ".join(CLIPS_BY_NAME[part].text for part in SWITCH_PARTS)
    return CLIPS_BY_NAME[clip].text


def terms_for(clip: str) -> tuple[str, ...]:
    if clip == SWITCH_NAME:
        return tuple(t for part in SWITCH_PARTS for t in CLIPS_BY_NAME[part].terms)
    return CLIPS_BY_NAME[clip].terms


async def one(
    client: Mistral, experiment: str, run: int, model: str, clip: str, extra_silence_s: float = 0.0, **kwargs: Any
) -> dict[str, Any]:
    pcm = read_pcm(clip) + silence(extra_silence_s)
    try:
        result = await run_session(client, model, clip, pcm, **kwargs)
        row = result.summary(reference_text(clip))
    except Exception as exc:  # noqa: BLE001 - a failed session is a data point
        row = {"model": model, "clip": clip, "error": f"{type(exc).__name__}: {exc}", **kwargs}
    row.update(
        {"experiment": experiment, "run": run, "extra_silence_s": extra_silence_s, "at": time.strftime("%H:%M:%S")}
    )
    if "final_text" in row:
        row["terms"] = term_hits(row["final_text"], terms_for(clip))
    with (RESULTS_DIR / f"{experiment}.jsonl").open("a") as sink:
        sink.write(json.dumps(row, ensure_ascii=False) + "\n")
    print(
        f"[{experiment} r{run}] {model:<40} {clip:<6} delay={row.get('delay_ms')} flush={row.get('flush')} "
        f"bias={'y' if row.get('bias') else 'n'} done+{row.get('done_from_end_s')}s last+{row.get('last_delta_from_end_s')}s "
        f"wer={row.get('wer')} lang={row.get('languages')} err={row.get('error')}\n    {row.get('final_text')!r}",
        flush=True,
    )
    return row


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "experiment",
        choices=["once", "models", "delay", "bias", "bias_extra", "switch", "endonly", "turn", "afterdone"],
    )
    parser.add_argument("--model", default=BEST_DEFAULT)
    parser.add_argument("--clip", default="EN1")
    parser.add_argument("--runs", type=int, default=3)
    args = parser.parse_args()
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    clips = [c.name for c in CLIPS]

    async with Mistral(api_key=load_api_key()) as client:
        if args.experiment == "once":
            await one(client, "once", 1, args.model, args.clip)
        elif args.experiment == "models":
            # run-major order spreads any drift in server load across models
            for run in range(1, args.runs + 1):
                for clip in clips:
                    for model in MODELS:
                        await one(client, "models", run, model, clip)
        elif args.experiment == "delay":
            for run in range(1, args.runs + 1):
                for clip in clips:
                    for delay in (None, 200, 500):
                        await one(client, "delay", run, args.model, clip, delay_ms=delay)
        elif args.experiment == "bias":
            for run in range(1, args.runs + 1):
                for clip in ("EN2", "FR2", "FR1"):
                    for bias in (None, CONTEXT_BIAS, SINGLE_WORD_BIAS):
                        await one(client, "bias", run, args.model, clip, bias=bias)
        elif args.experiment == "bias_extra":
            # the requested list plus the product line the bias runs turned French; EN1 checks for side effects
            extended = [*CONTEXT_BIAS, "Hyaluronic Aloe"]
            for run in range(1, args.runs + 1):
                for clip in ("EN1", "EN2", "FR2"):
                    await one(client, "bias_extra", run, args.model, clip, bias=extended)
        elif args.experiment == "switch":
            for run in range(1, args.runs + 1):
                for model in MODELS:
                    await one(client, "switch", run, model, SWITCH_NAME)
        elif args.experiment == "endonly":
            # the reference browser sends "end" without "flush" after ~1.5 s of silence
            for run in range(1, args.runs + 1):
                for clip in clips:
                    await one(client, "endonly", run, args.model, clip, flush=False)
                    await one(client, "endonly", run, args.model, clip, flush=False, extra_silence_s=1.5)
        elif args.experiment == "afterdone":
            # keep reading after transcription.done to see how the server ends the socket
            for model in MODELS[:2]:
                await one(client, "afterdone", 1, model, "FR1", stop_at_done=False, tail_timeout_s=3.0)
        elif args.experiment == "turn":
            # undocumented server turn detection (raw session.update), 1.5 s of silence after speech;
            # reads past transcription.done to see how the socket ends
            for run in range(1, args.runs + 1):
                for clip in clips:
                    await one(
                        client,
                        "turn",
                        run,
                        args.model,
                        clip,
                        extra_silence_s=1.5,
                        turn_detection={},
                        stop_at_done=False,
                        tail_timeout_s=4.0,
                    )


if __name__ == "__main__":
    asyncio.run(main())
