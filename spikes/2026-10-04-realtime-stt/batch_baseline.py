"""Offline baseline: transcribe each clip with the batch API, with and without context_bias (single words).

Checks that every TTS clip holds the full sentence, and shows what context_bias does where the SDK
documents it (client.audio.transcriptions.complete_async).
"""

from __future__ import annotations

import asyncio
import json
import time

from mistralai.client import Mistral

from common import CLIPS, CLIPS_DIR, RESULTS_DIR, SINGLE_WORD_BIAS, load_api_key, term_hits, wer

BATCH_MODELS = ["voxtral-mini-latest", "voxtral-transcribe-3"]


async def main() -> None:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    out = RESULTS_DIR / "batch_baseline.jsonl"
    async with Mistral(api_key=load_api_key()) as client:
        with out.open("w") as sink:
            for model in BATCH_MODELS:
                for clip in CLIPS:
                    wav = (CLIPS_DIR / f"{clip.name}.wav").read_bytes()
                    for bias in (False, True):
                        t0 = time.perf_counter()
                        result = await client.audio.transcriptions.complete_async(
                            model=model,
                            file={"file_name": f"{clip.name}.wav", "content": wav},
                            context_bias=SINGLE_WORD_BIAS if bias else None,
                        )
                        elapsed = time.perf_counter() - t0
                        row = {
                            "model": model,
                            "clip": clip.name,
                            "bias": bias,
                            "seconds": round(elapsed, 2),
                            "language": result.language,
                            "text": result.text,
                            "wer": round(wer(clip.text, result.text), 3),
                            "terms": term_hits(result.text, clip.terms),
                        }
                        sink.write(json.dumps(row, ensure_ascii=False) + "\n")
                        print(json.dumps(row, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())
