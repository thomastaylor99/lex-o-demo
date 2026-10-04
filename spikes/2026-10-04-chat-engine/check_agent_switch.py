"""Agent switch inside one chat history: does the API accept a transfer_to_agent call in the
history when the next agent's tools no longer include it, or when there are no tools at all?
Also: which message shapes pass validation, and is a second system message accepted?

All cases stream mistral-small-latest. The main cases run 3 times to see behaviour, the shape
variants once. Validation errors are recorded verbatim; 429/5xx are retried.
"""

from __future__ import annotations

import asyncio
import copy
import json
import sys
from typing import Any

from common import RESULTS, make_client, ms, pause, record_stream_retry, write_json
from fixtures import CONCIERGE_PROMPT, CONCIERGE_WELCOME, EXPERT_TOOLS, HANDOFF, VISITOR_LINES, expert_system

MODEL = "mistral-small-latest"
CALL_ID = "Tr4nsf3r1"  # 9 alphanumerics, the format the API itself emits (e.g. "CJjlfAEGc")
TRANSFER_ARGS = {"agent": "skincare", "summary": HANDOFF}

ASSISTANT_TRANSFER: dict[str, Any] = {
    "role": "assistant",
    "content": "",
    "tool_calls": [{"id": CALL_ID, "type": "function", "function": {"name": "transfer_to_agent", "arguments": json.dumps(TRANSFER_ARGS)}}],
}
TOOL_RESULT: dict[str, Any] = {
    "role": "tool",
    "tool_call_id": CALL_ID,
    "name": "transfer_to_agent",
    "content": json.dumps({"status": "transferred", "agent": "skincare"}),
}


def base(system: str | None = None) -> list[dict[str, Any]]:
    return [
        {"role": "system", "content": system or expert_system()},
        {"role": "assistant", "content": CONCIERGE_WELCOME},
        {"role": "user", "content": VISITOR_LINES["en_need"]},
        copy.deepcopy(ASSISTANT_TRANSFER),
        copy.deepcopy(TOOL_RESULT),
    ]


def case_messages(name: str) -> list[dict[str, Any]]:
    m = base()
    if name in ("switch_expert_tools", "switch_no_tools"):
        return m
    if name == "second_system_mid":
        # Concierge prompt first, expert prompt appended as a second system message after the transfer.
        m = base(CONCIERGE_PROMPT)
        m.append({"role": "system", "content": expert_system()})
        return m
    if name == "second_system_top":
        m.insert(0, {"role": "system", "content": CONCIERGE_PROMPT})
        return m
    if name == "assistant_content_none":
        m[3]["content"] = None
        return m
    if name == "assistant_content_omitted":
        del m[3]["content"]
        return m
    if name == "tool_without_name":
        del m[4]["name"]
        return m
    if name == "tool_id_call_style":
        m[3]["tool_calls"][0]["id"] = "call_abc123"
        m[4]["tool_call_id"] = "call_abc123"
        return m
    if name == "args_as_dict":
        m[3]["tool_calls"][0]["function"]["arguments"] = TRANSFER_ARGS
        return m
    if name == "mismatched_tool_call_id":
        m[4]["tool_call_id"] = "Wr0ngId99"
        return m
    if name == "dangling_tool_call":
        return m[:4]
    if name == "missing_result_then_user":
        return [*m[:4], {"role": "user", "content": "Also, it needs to be fragrance-free please."}]
    if name == "tool_without_id":
        del m[4]["tool_call_id"]
        return m
    if name == "tool_then_user":
        m.append({"role": "user", "content": "Also, it needs to be fragrance-free please."})
        return m
    raise ValueError(name)


CASES: list[tuple[str, int, dict[str, Any]]] = [
    ("switch_expert_tools", 3, {"tools": EXPERT_TOOLS}),
    ("switch_no_tools", 3, {}),
    ("second_system_mid", 3, {"tools": EXPERT_TOOLS}),
    ("second_system_top", 3, {"tools": EXPERT_TOOLS}),
    ("assistant_content_none", 1, {"tools": EXPERT_TOOLS}),
    ("assistant_content_omitted", 1, {"tools": EXPERT_TOOLS}),
    ("tool_without_name", 1, {"tools": EXPERT_TOOLS}),
    ("tool_id_call_style", 1, {"tools": EXPERT_TOOLS}),
    ("args_as_dict", 1, {"tools": EXPERT_TOOLS}),
    ("mismatched_tool_call_id", 1, {"tools": EXPERT_TOOLS}),
    ("dangling_tool_call", 1, {"tools": EXPERT_TOOLS}),
    ("tool_then_user", 1, {"tools": EXPERT_TOOLS}),
    ("missing_result_then_user", 1, {"tools": EXPERT_TOOLS}),
    ("tool_without_id", 1, {"tools": EXPERT_TOOLS}),
]


async def main() -> None:
    """usage: python check_agent_switch.py [case ...]  (no case: run all; results merge into agent_switch.json)"""
    only = set(sys.argv[1:])
    path = RESULTS / "agent_switch.json"
    out: dict[str, Any] = json.loads(path.read_text()) if only and path.exists() else {}
    async with make_client() as client:
        await record_stream_retry(client, model=MODEL, messages=case_messages("switch_expert_tools"), tools=EXPERT_TOOLS)
        for name, runs, extra in CASES:
            if only and name not in only:
                continue
            results = []
            for _ in range(runs):
                rec, retried = await record_stream_retry(client, model=MODEL, messages=case_messages(name), **extra)
                tools_called = [c["name"] for c in rec.tool_calls]
                results.append({
                    "accepted": rec.error is None,
                    "error": rec.error,
                    "retried_5xx": len(retried),
                    "ttft_ms": None if rec.t_first_content is None else round(rec.t_first_content * 1000),
                    "end_ms": None if rec.t_end is None else round(rec.t_end * 1000),
                    "reply": rec.content,
                    "tools_called": tools_called,
                    "tool_args": [c["args"] for c in rec.tool_calls],
                    "finish_reason": rec.finish_reason,
                })
                verdict = "ACCEPTED" if rec.error is None else f"REJECTED {rec.error['status']}"
                print(f"{name:26} {verdict:13} ttft={ms(rec.t_first_content):>5} tools={tools_called or '-'} reply={rec.content[:110]!r}")
                if rec.error:
                    print("    ", rec.error["body"][:400])
                await pause()
            out[name] = {"messages": case_messages(name)[1:], "extra": {k: ("EXPERT_TOOLS" if k == "tools" else v) for k, v in extra.items()}, "runs": results}
    write_json("agent_switch.json", out)


if __name__ == "__main__":
    asyncio.run(main())
