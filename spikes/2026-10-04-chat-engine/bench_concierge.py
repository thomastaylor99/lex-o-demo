"""Step 4: the concierge's single forced transfer_to_agent call.

For each tool_choice variant (named function, "any", "required", and "auto" as a baseline),
each visitor line (English need, "Hello!", French need) and each mode (complete_async,
stream_async): is it accepted, how fast is the call complete, and which agent is picked.

mistral-small-latest runs every variant 10 times. ministral-14b-latest and
mistral-medium-latest run the named variant 5 times, for the model comparison.
Runs are interleaved; 429/5xx are retried and counted.
"""

from __future__ import annotations

import asyncio
import json
from collections import Counter, defaultdict
from typing import Any

from common import RETRYABLE, make_client, median, ms, p90, pause, record_stream_retry, timed_complete, write_json
from fixtures import CONCIERGE_TOOLS, FORCED_TRANSFER, concierge_messages

VARIANTS: dict[str, Any] = {"named": FORCED_TRANSFER, "any": "any", "required": "required", "auto": "auto"}
LINES = ["en_need", "hello", "fr_need"]
PLAN = {"mistral-small-latest": (10, list(VARIANTS)), "ministral-14b-latest": (5, ["named"]), "mistral-medium-latest": (5, ["named"])}


async def call_complete(client: Any, model: str, line: str, choice: Any) -> dict[str, Any]:
    retried = []
    for attempt in range(4):
        secs, resp, err = await timed_complete(client, model=model, messages=concierge_messages(line), tools=CONCIERGE_TOOLS, tool_choice=choice)
        if not err or err.get("status") not in RETRYABLE:
            break
        retried.append(err)
        await asyncio.sleep(1.5 * (attempt + 1))
    if err:
        return {"accepted": False, "error": err, "retried_5xx": len(retried)}
    msg = resp.choices[0].message
    calls = msg.tool_calls or []
    args = calls[0].function.arguments if calls else None
    args = json.loads(args) if isinstance(args, str) else args
    return {
        "accepted": True, "retried_5xx": len(retried), "latency": secs, "model_reported": resp.model,
        "tool": calls[0].function.name if calls else None, "n_calls": len(calls),
        "agent": (args or {}).get("agent"), "summary": (args or {}).get("summary"),
        "args_type": type(calls[0].function.arguments).__name__ if calls else None,
        "text": msg.content if isinstance(msg.content, str) else str(msg.content or ""),
        "finish_reason": str(resp.choices[0].finish_reason),
        "completion_tokens": resp.usage.completion_tokens,
    }


async def call_stream(client: Any, model: str, line: str, choice: Any) -> dict[str, Any]:
    rec, retried = await record_stream_retry(client, model=model, messages=concierge_messages(line), tools=CONCIERGE_TOOLS, tool_choice=choice)
    if rec.error:
        return {"accepted": False, "error": rec.error, "retried_5xx": len(retried)}
    call = rec.tool_calls[0] if rec.tool_calls else None
    args = json.loads(call["args"]) if call and call["args"] else {}
    return {
        "accepted": True, "retried_5xx": len(retried), "latency": rec.t_tool_complete if call else rec.t_end,
        "t_end": rec.t_end, "t_first_chunk": rec.t_first_chunk, "model_reported": rec.model_reported,
        "tool": call["name"] if call else None, "n_calls": len(rec.tool_calls), "fragments": call["fragments"] if call else 0,
        "agent": args.get("agent"), "summary": args.get("summary"), "text": rec.content,
        "finish_reason": rec.finish_reason, "completion_tokens": (rec.usage or {}).get("completion_tokens"),
    }


def summarise(rs: list[dict[str, Any]]) -> dict[str, Any]:
    ok = [r for r in rs if r["accepted"]]
    called = [r for r in ok if r["tool"] == "transfer_to_agent"]
    lat = [r["latency"] for r in called]
    return {
        "n": len(rs), "accepted": len(ok), "errors": [r["error"] for r in rs if not r["accepted"]][:1],
        "retried_5xx": sum(r["retried_5xx"] for r in rs),
        "call_rate": len(called) / len(ok) if ok else None,
        "latency_median": median(lat), "latency_p90": p90(lat),
        "agents": dict(Counter(r["agent"] for r in ok)),
        "text_with_call": sum(1 for r in called if (r["text"] or "").strip()),
        "sample_summary": called[0]["summary"] if called else None,
        "sample_text": next((r["text"] for r in ok if (r["text"] or "").strip()), None),
        "models_reported": sorted({r["model_reported"] for r in ok if r.get("model_reported")}),
    }


async def main() -> None:
    results: dict[tuple[str, str, str, str], list[dict[str, Any]]] = defaultdict(list)
    async with make_client() as client:
        for model in PLAN:  # warm-up: connection and prompt cache
            await call_complete(client, model, "en_need", FORCED_TRANSFER)
        for round_no in range(max(n for n, _ in PLAN.values())):
            for model, (n, variants) in PLAN.items():
                if round_no >= n:
                    continue
                for line in LINES:
                    for variant in variants:
                        for mode, fn in (("complete", call_complete), ("stream", call_stream)):
                            r = await fn(client, model, line, VARIANTS[variant])
                            results[(model, variant, mode, line)].append(r)
                            if r["accepted"]:
                                print(f"r{round_no} {model:22} {variant:8} {mode:8} {line:8} {ms(r['latency']):>5} ms tool={r['tool']} agent={r['agent']} text={(r['text'] or '')[:50]!r}")
                            else:
                                print(f"r{round_no} {model:22} {variant:8} {mode:8} {line:8} REJECTED {r['error']}")
                            await pause(0.2)
    table = {"/".join(k): summarise(v) for k, v in results.items()}
    write_json("concierge_runs.json", {"/".join(k): v for k, v in results.items()})
    write_json("concierge_summary.json", table)
    print("\nmodel/variant/mode/line | accepted | call rate | median/p90 ms | agents | text with call | retried")
    for k, s in table.items():
        rate = "n/a" if s["call_rate"] is None else f"{s['call_rate']:.0%}"
        print(f"{k:52} {s['accepted']}/{s['n']} {rate:>5} {ms(s['latency_median']):>5}/{ms(s['latency_p90']):<5} {s['agents']} {s['text_with_call']} {s['retried_5xx']}")


if __name__ == "__main__":
    asyncio.run(main())
