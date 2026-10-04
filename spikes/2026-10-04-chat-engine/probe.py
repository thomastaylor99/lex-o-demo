"""Dump every raw stream chunk of one call, with timings, to see the exact wire format.

usage: python probe.py <model> <turn> [extra-json]
  turn: question | tool | tool_preamble | concierge_en | concierge_hello | concierge_fr | tokens
  extra-json: extra request fields, e.g. '{"reasoning_effort": "none"}'
"""

from __future__ import annotations

import asyncio
import json
import sys
from typing import Any

from common import make_client, ms, record_stream, write_json
from fixtures import EXPERT_TOOLS, CONCIERGE_TOOLS, FORCED_TRANSFER, concierge_messages, expert_system, question_turn, tool_turn


def request(model: str, turn: str) -> dict[str, Any]:
    if turn == "question":
        return {"model": model, "messages": question_turn(), "tools": EXPERT_TOOLS}
    if turn == "tool":
        return {"model": model, "messages": tool_turn(), "tools": EXPERT_TOOLS}
    if turn == "tool_preamble":
        return {"model": model, "messages": tool_turn(preamble=True), "tools": EXPERT_TOOLS}
    if turn.startswith("concierge_"):
        key = {"concierge_en": "en_need", "concierge_hello": "hello", "concierge_fr": "fr_need"}[turn]
        return {"model": model, "messages": concierge_messages(key), "tools": CONCIERGE_TOOLS, "tool_choice": FORCED_TRANSFER}
    raise SystemExit(f"unknown turn {turn}")


async def token_counts(model: str) -> None:
    """Prompt tokens of the expert system prompt alone, and with the four tool schemas."""
    async with make_client() as client:
        base = [{"role": "system", "content": expert_system()}, {"role": "user", "content": "Hi"}]
        bare = await client.chat.complete_async(model=model, messages=base, max_tokens=1)
        tooled = await client.chat.complete_async(model=model, messages=base, tools=EXPERT_TOOLS, max_tokens=1)
        minimal = await client.chat.complete_async(model=model, messages=[{"role": "user", "content": "Hi"}], max_tokens=1)
        print("prompt tokens, 'Hi' alone:", minimal.usage.prompt_tokens)
        print("prompt tokens, system prompt + 'Hi':", bare.usage.prompt_tokens)
        print("prompt tokens, system prompt + 4 tools + 'Hi':", tooled.usage.prompt_tokens)
        for name, turn in (("question turn", question_turn()), ("tool turn", tool_turn())):
            r = await client.chat.complete_async(model=model, messages=turn, tools=EXPERT_TOOLS, max_tokens=1)
            print(f"prompt tokens, {name} with tools:", r.usage.prompt_tokens)


async def main() -> None:
    model, turn = sys.argv[1], sys.argv[2]
    if turn == "tokens":
        await token_counts(model)
        return
    extra = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
    async with make_client() as client:
        rec = await record_stream(client, keep_raw=True, **request(model, turn), **extra)
    for c in rec.raw_chunks or []:
        print(json.dumps(c, ensure_ascii=False))
    s = rec.summary()
    print("\nsummary:", json.dumps({k: s[k] for k in ("model_reported", "finish_reason", "content", "tool_calls", "usage", "content_types", "error")}, ensure_ascii=False, indent=1))
    print("headers", ms(rec.t_headers), "first chunk", ms(rec.t_first_chunk), "first content", ms(rec.t_first_content),
          "first thinking", ms(rec.t_first_thinking), "first tool", ms(rec.t_first_tool), "tool complete", ms(rec.t_tool_complete), "end", ms(rec.t_end))
    tag = turn + ("_" + "_".join(f"{k}-{v}" for k, v in extra.items()) if extra else "")
    write_json(f"probe_{model}_{tag}.json", {"summary": s, "raw_chunks": rec.raw_chunks})


if __name__ == "__main__":
    asyncio.run(main())
