"""Steps 2 and 3: skincare expert latency per model, streamed with chat.stream_async.

Configs, all with the four expert tools and default sampling:
  question       history after one diagnostic exchange; should produce a question, no tool
  question_cold  same, with a random nonce at the start of the system prompt to defeat the prefix cache
  tool           history after two exchanges and an explicit ask; should call search_products
  tool_preamble  same, plus a prompt rule asking for one spoken sentence before any tool call

Runs are interleaved round-robin across models so time-varying load hits every model alike.
One discarded warm-up call per model and config opens the connection and warms the cache.
Calls that fail with 429/5xx are retried; the failures are counted in "retried_errors".

usage: python bench_expert.py [model ...] [--tag=name]
"""

from __future__ import annotations

import asyncio
import re
import sys
import uuid
from collections import defaultdict
from typing import Any

from common import make_client, median, ms, p90, pause, record_stream, record_stream_retry, write_json
from fixtures import EXPERT_TOOLS, question_turn, tool_turn

RUNS = {"mistral-small-latest": 10, "ministral-14b-latest": 5, "mistral-medium-latest": 5}
CONFIGS = ["question", "question_cold", "tool", "tool_preamble"]


def messages_for(config: str) -> list[dict[str, str]]:
    if config == "question":
        return question_turn()
    if config == "question_cold":
        msgs = question_turn()
        msgs[0] = {"role": "system", "content": f"Session {uuid.uuid4().hex[:12]}.\n\n" + msgs[0]["content"]}
        return msgs
    if config == "tool":
        return tool_turn()
    if config == "tool_preamble":
        return tool_turn(preamble=True)
    raise ValueError(config)


def sentences(text: str) -> int:
    return len([s for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s])


def summarise(runs: list[dict[str, Any]]) -> dict[str, Any]:
    ok = [r for r in runs if not r["error"]]
    ttft = [r["t_first_content"] for r in ok if r["t_first_content"] is not None]
    tool_done = [r["t_tool_complete"] for r in ok if r["t_tool_complete"] is not None]
    first_chunk = [r["t_first_chunk"] for r in ok if r["t_first_chunk"] is not None]
    end = [r["t_end"] for r in ok if r["t_end"] is not None]
    with_tool = [r for r in ok if r["tool_calls"]]
    with_text = [r for r in ok if r["content"].strip()]
    both = [r for r in ok if r["tool_calls"] and r["content"].strip()]
    text_first = [r for r in both if r["first_content_chunk"] < r["first_tool_chunk"]]
    cached = [((r["usage"] or {}).get("prompt_tokens_details") or {}).get("cached_tokens") or 0 for r in ok]
    return {
        "n": len(runs),
        "errors": len(runs) - len(ok),
        "retried_errors": sum(len(r.get("retried", [])) for r in runs),
        "ttft_median": median(ttft), "ttft_p90": p90(ttft), "ttft_n": len(ttft),
        "first_chunk_median": median(first_chunk),
        "tool_complete_median": median(tool_done), "tool_complete_p90": p90(tool_done), "tool_n": len(tool_done),
        "end_median": median(end), "end_p90": p90(end),
        "tool_rate": len(with_tool) / len(ok) if ok else None,
        "search_rate": sum(1 for r in ok if any(c["name"] == "search_products" for c in r["tool_calls"])) / len(ok) if ok else None,
        "text_rate": len(with_text) / len(ok) if ok else None,
        "text_and_tool": len(both),
        "text_before_tool": len(text_first),
        "question_rate": sum(1 for r in with_text if "?" in r["content"]) / len(ok) if ok else None,
        "sentences_median": median([sentences(r["content"]) for r in with_text]) if with_text else None,
        "words_median": median([len(r["content"].split()) for r in with_text]) if with_text else None,
        "completion_tokens_median": median([(r["usage"] or {}).get("completion_tokens") or 0 for r in ok]),
        "cache_hit_runs": sum(1 for c in cached if c > 0),
        "models_reported": sorted({r["model_reported"] for r in ok if r["model_reported"]}),
    }


async def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    tag = next((a.split("=", 1)[1] for a in sys.argv[1:] if a.startswith("--tag=")), "run2")
    models = args or list(RUNS)
    runs: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    raw: dict[str, Any] = {}
    async with make_client() as client:
        for model in models:
            for config in CONFIGS:
                await record_stream(client, model=model, messages=messages_for(config), tools=EXPERT_TOOLS)
                await pause()
        for round_no in range(max(RUNS[m] for m in models)):
            for model in models:
                if round_no >= RUNS[model]:
                    continue
                for config in CONFIGS:
                    rec, retried = await record_stream_retry(client, keep_raw=round_no == 0, model=model, messages=messages_for(config), tools=EXPERT_TOOLS)
                    s = rec.summary()
                    s["retried"] = retried
                    runs[(model, config)].append(s)
                    if round_no == 0:
                        raw[f"{model}/{config}"] = rec.raw_chunks
                    tools = ",".join(c["name"] for c in s["tool_calls"]) or "-"
                    print(f"r{round_no} {model:24} {config:14} ttft={ms(rec.t_first_content):>5} tool={ms(rec.t_tool_complete):>5} "
                          f"end={ms(rec.t_end):>5} tools={tools} err={bool(rec.error)} retried={len(retried)} text={rec.content[:70]!r}")
                    if rec.error:
                        print("   error:", rec.error)
                    await pause()
    table = {f"{m}/{c}": summarise(rs) for (m, c), rs in runs.items()}
    write_json(f"expert_runs_{tag}.json", {f"{m}/{c}": rs for (m, c), rs in runs.items()})
    write_json(f"expert_raw_chunks_{tag}.json", raw)
    write_json(f"expert_summary_{tag}.json", table)
    print("\nmodel / config | n | TTFT med/p90 ms | tool complete med/p90 ms | end med ms | tool rate | text+tool | cache hits | retried 5xx")
    for key, s in table.items():
        print(f"{key:38} {s['n']:>2} {ms(s['ttft_median']):>6}/{ms(s['ttft_p90']):<6} {ms(s['tool_complete_median']):>6}/{ms(s['tool_complete_p90']):<6} "
              f"{ms(s['end_median']):>6} {s['tool_rate']:.0%} {s['text_and_tool']} {s['cache_hit_runs']} {s['retried_errors']}")


if __name__ == "__main__":
    asyncio.run(main())
