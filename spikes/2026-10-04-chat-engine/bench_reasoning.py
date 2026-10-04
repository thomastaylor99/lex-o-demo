"""Step 5: are reasoning_effort and prompt_mode accepted on mistral-small-latest, and what do they
do to latency? One acceptance call per setting, then 5 interleaved rounds of the expert question
turn and tool turn for every accepted setting. Thinking arrives as list content with type
"thinking"; its time and length are recorded separately from the spoken text.

A single acceptance call per setting is also made on ministral-14b-latest and mistral-medium-latest.
"""

from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import Any

from common import make_client, median, ms, p90, pause, record_stream_retry, write_json
from fixtures import EXPERT_TOOLS, question_turn, tool_turn

MODEL = "mistral-small-latest"
SETTINGS: dict[str, dict[str, Any]] = {
    "default": {},
    "effort_none": {"reasoning_effort": "none"},
    "effort_minimal": {"reasoning_effort": "minimal"},
    "effort_low": {"reasoning_effort": "low"},
    "effort_medium": {"reasoning_effort": "medium"},
    "effort_high": {"reasoning_effort": "high"},
    "effort_xhigh": {"reasoning_effort": "xhigh"},
    "prompt_mode_reasoning": {"prompt_mode": "reasoning"},
}
OTHER_MODELS = ["ministral-14b-latest", "mistral-medium-latest"]
ROUNDS = 5


def brief(rec: Any) -> dict[str, Any]:
    s = rec.summary()
    return {
        "error": s["error"],
        "t_first_content": s["t_first_content"], "t_first_thinking": s["t_first_thinking"],
        "t_tool_complete": s["t_tool_complete"], "t_end": s["t_end"],
        "thinking_chars": len(s["thinking"]), "content": s["content"], "content_types": s["content_types"],
        "tools": [c["name"] for c in s["tool_calls"]],
        "completion_tokens": (s["usage"] or {}).get("completion_tokens"),
    }


async def main() -> None:
    accepted: dict[str, Any] = {}
    other: dict[str, Any] = {}
    runs: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    async with make_client() as client:
        for name, extra in SETTINGS.items():
            rec, _ = await record_stream_retry(client, model=MODEL, messages=question_turn(), tools=EXPERT_TOOLS, **extra)
            accepted[name] = brief(rec)
            print(f"{name:24} {'ACCEPTED' if not rec.error else 'REJECTED'} ttft={ms(rec.t_first_content)} thinking={ms(rec.t_first_thinking)} "
                  f"types={rec.content_types} tokens={(rec.usage or {}).get('completion_tokens')} {rec.error or ''}")
            await pause()
        for model in OTHER_MODELS:
            for name in ("effort_none", "effort_high", "prompt_mode_reasoning"):
                rec, _ = await record_stream_retry(client, model=model, messages=question_turn(), tools=EXPERT_TOOLS, **SETTINGS[name])
                other[f"{model}/{name}"] = brief(rec)
                print(f"{model:22} {name:22} {'ACCEPTED' if not rec.error else 'REJECTED'} ttft={ms(rec.t_first_content)} thinking={ms(rec.t_first_thinking)} "
                      f"tokens={(rec.usage or {}).get('completion_tokens')} {rec.error or ''}")
                await pause()
        live = [n for n, a in accepted.items() if not a["error"]]
        for round_no in range(ROUNDS):
            for name in live:
                for turn, msgs in (("question", question_turn()), ("tool", tool_turn())):
                    rec, _ = await record_stream_retry(client, model=MODEL, messages=msgs, tools=EXPERT_TOOLS, **SETTINGS[name])
                    runs[(name, turn)].append(brief(rec))
                    print(f"r{round_no} {name:24} {turn:8} text={ms(rec.t_first_content):>5} thinking={ms(rec.t_first_thinking):>5} "
                          f"tool={ms(rec.t_tool_complete):>5} end={ms(rec.t_end):>5} think_chars={len(rec.thinking)} tokens={(rec.usage or {}).get('completion_tokens')}")
                    await pause()
    table = {}
    for (name, turn), rs in runs.items():
        ok = [r for r in rs if not r["error"]]
        key = "t_first_content" if turn == "question" else "t_tool_complete"
        vals = [r[key] for r in ok if r[key] is not None]
        table[f"{name}/{turn}"] = {
            "n": len(rs), "ok": len(ok), "median": median(vals), "p90": p90(vals),
            "end_median": median([r["t_end"] for r in ok if r["t_end"]]),
            "thinking_runs": sum(1 for r in ok if r["thinking_chars"]),
            "thinking_chars_median": median([r["thinking_chars"] for r in ok]),
            "first_thinking_median": median([r["t_first_thinking"] for r in ok if r["t_first_thinking"]]),
            "completion_tokens_median": median([r["completion_tokens"] or 0 for r in ok]),
            "tool_rate": sum(1 for r in ok if r["tools"]) / len(ok) if ok else None,
        }
    write_json("reasoning.json", {"acceptance": accepted, "other_models": other, "runs": {f"{a}/{b}": v for (a, b), v in runs.items()}, "summary": table})
    print("\nsetting/turn | ok | median/p90 ms (question: first text, tool: call complete) | end | thinking runs | completion tokens")
    for k, s in table.items():
        print(f"{k:34} {s['ok']}/{s['n']} {ms(s['median']):>6}/{ms(s['p90']):<6} {ms(s['end_median']):>6} {s['thinking_runs']} {s['completion_tokens_median']}")


if __name__ == "__main__":
    asyncio.run(main())
