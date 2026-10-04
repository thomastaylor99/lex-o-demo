"""Probe: how two tool calls in one response arrive in the stream (mistral-small-latest)."""

from __future__ import annotations

import asyncio
import json

from common import make_client, ms, record_stream_retry, write_json
from fixtures import EXPERT_TOOLS, tool_turn

ASK = "Yes, you can save my profile, I'm Sarah. And while you're at it, show me a gentle cleanser too."


async def main() -> None:
    msgs = [*tool_turn()[:-1], {"role": "user", "content": tool_turn()[-1]["content"] + " " + ASK}]
    out = []
    async with make_client() as client:
        for _ in range(3):
            rec, _ = await record_stream_retry(client, keep_raw=True, model="mistral-small-latest", messages=msgs, tools=EXPERT_TOOLS, parallel_tool_calls=True)
            for c in rec.raw_chunks or []:
                if c["chunk"]["choices"][0]["delta"].get("tool_calls"):
                    print(json.dumps(c)[:900])
            print("calls:", [(t["name"], t["index"], t["fragments"]) for t in rec.tool_calls], "complete", ms(rec.t_tool_complete), "end", ms(rec.t_end), "text", repr(rec.content[:80]))
            out.append({"summary": rec.summary(), "raw_chunks": rec.raw_chunks})
    write_json("probe_parallel_tool_calls.json", out)


if __name__ == "__main__":
    asyncio.run(main())
