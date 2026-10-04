"""Shared plumbing for the chat-engine spike: client, stream recorder, stats, result files.

Throwaway spike code. Nothing in backend/ or frontend/ imports it.
"""

from __future__ import annotations

import asyncio
import json
import math
import os
import statistics
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from mistralai.client import Mistral
from mistralai.client.errors import HTTPValidationError, SDKError

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
RESULTS = HERE / "results"


def make_client() -> Mistral:
    """Build a client from the repo .env. The key is never printed."""
    load_dotenv(REPO / ".env")
    key = os.environ.get("MISTRAL_API_KEY")
    if not key:
        raise SystemExit("MISTRAL_API_KEY is missing from .env")
    return Mistral(api_key=key, timeout_ms=60_000)


def median(xs: list[float]) -> float | None:
    return statistics.median(xs) if xs else None


def p90(xs: list[float]) -> float | None:
    """Nearest-rank p90: the 9th of 10 values, the max of 5."""
    if not xs:
        return None
    s = sorted(xs)
    return s[max(0, math.ceil(0.9 * len(s)) - 1)]


def ms(x: float | None) -> str:
    return "n/a" if x is None else f"{x * 1000:.0f}"


def write_json(name: str, payload: Any) -> Path:
    RESULTS.mkdir(exist_ok=True)
    path = RESULTS / name
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False, default=str))
    return path


def api_error(exc: Exception) -> dict[str, Any]:
    """Status and a trimmed body for a rejected request. No headers, so no key."""
    status = getattr(exc, "status_code", None)
    body = getattr(exc, "body", None) or str(exc)
    return {"type": type(exc).__name__, "status": status, "body": str(body)[:600]}


@dataclass
class ToolCallAcc:
    index: int | None
    id: str | None = None
    name: str = ""
    args: str = ""
    args_types: list[str] = field(default_factory=list)
    fragments: int = 0
    t_first: float | None = None
    t_complete: float | None = None  # first moment the accumulated arguments parse as a JSON object


@dataclass
class StreamRecord:
    model_requested: str
    model_reported: str | None = None
    t_headers: float | None = None
    t_first_chunk: float | None = None
    t_first_content: float | None = None
    t_first_thinking: float | None = None
    t_first_tool: float | None = None
    t_tool_complete: float | None = None
    t_finish: float | None = None
    t_end: float | None = None
    content: str = ""
    thinking: str = ""
    chunk_count: int = 0
    content_chunk_count: int = 0
    first_content_chunk: int | None = None
    first_tool_chunk: int | None = None
    finish_reason: str | None = None
    usage: dict[str, Any] | None = None
    tool_calls: list[dict[str, Any]] = field(default_factory=list)
    content_types: list[str] = field(default_factory=list)
    error: dict[str, Any] | None = None
    raw_chunks: list[dict[str, Any]] | None = None

    def summary(self) -> dict[str, Any]:
        d = asdict(self)
        d.pop("raw_chunks")
        return d


def _parses_as_object(s: str) -> bool:
    try:
        return isinstance(json.loads(s), dict)
    except (ValueError, TypeError):
        return False


async def record_stream(client: Mistral, *, keep_raw: bool = False, **kwargs: Any) -> StreamRecord:
    """Run one chat.stream_async call and time every stage.

    t=0 is taken just before the request is sent. Content may arrive as a str or as a
    list of typed chunks (text, thinking); tool-call fragments are accumulated by index.
    """
    rec = StreamRecord(model_requested=kwargs["model"])
    raw: list[dict[str, Any]] = []
    calls: dict[Any, ToolCallAcc] = {}
    t0 = time.perf_counter()
    try:
        async with await client.chat.stream_async(**kwargs) as stream:
            rec.t_headers = time.perf_counter() - t0
            async for event in stream:
                t = time.perf_counter() - t0
                chunk = event.data
                rec.chunk_count += 1
                if rec.t_first_chunk is None:
                    rec.t_first_chunk = t
                if keep_raw:
                    raw.append({"t_ms": round(t * 1000), "chunk": chunk.model_dump(mode="json", exclude_unset=True)})
                if chunk.model and rec.model_reported is None:
                    rec.model_reported = chunk.model
                if chunk.usage is not None:
                    rec.usage = chunk.usage.model_dump(mode="json")
                if not chunk.choices:
                    continue
                choice = chunk.choices[0]
                delta = choice.delta
                content = delta.content
                if isinstance(content, str):
                    if "str" not in rec.content_types:
                        rec.content_types.append("str")
                    if content:
                        rec.content += content
                        rec.content_chunk_count += 1
                        if rec.t_first_content is None:
                            rec.t_first_content = t
                            rec.first_content_chunk = rec.chunk_count
                elif isinstance(content, list):
                    for part in content:
                        kind = getattr(part, "type", type(part).__name__)
                        if f"list:{kind}" not in rec.content_types:
                            rec.content_types.append(f"list:{kind}")
                        text = getattr(part, "text", None)
                        if isinstance(text, str) and text:
                            rec.content += text
                            rec.content_chunk_count += 1
                            if rec.t_first_content is None:
                                rec.t_first_content = t
                                rec.first_content_chunk = rec.chunk_count
                        thinking = getattr(part, "thinking", None)
                        if thinking:
                            if rec.t_first_thinking is None:
                                rec.t_first_thinking = t
                            for th in thinking:
                                rec.thinking += getattr(th, "text", "") or ""
                tool_calls = delta.tool_calls
                if isinstance(tool_calls, list):
                    for tc in tool_calls:
                        key = tc.index if tc.index is not None else tc.id
                        acc = calls.setdefault(key, ToolCallAcc(index=tc.index))
                        acc.fragments += 1
                        if acc.t_first is None:
                            acc.t_first = t
                        if rec.t_first_tool is None:
                            rec.t_first_tool = t
                            rec.first_tool_chunk = rec.chunk_count
                        if tc.id and tc.id != "null":
                            acc.id = tc.id
                        fn = tc.function
                        if fn.name:
                            acc.name = fn.name
                        args = fn.arguments
                        acc.args_types.append(type(args).__name__)
                        if isinstance(args, dict):
                            acc.args += json.dumps(args)
                        elif isinstance(args, str):
                            acc.args += args
                        if acc.t_complete is None and _parses_as_object(acc.args):
                            acc.t_complete = t
                if choice.finish_reason is not None and rec.t_finish is None:
                    rec.t_finish = t
                    rec.finish_reason = str(choice.finish_reason)
            rec.t_end = time.perf_counter() - t0
    except (HTTPValidationError, SDKError) as exc:
        rec.error = api_error(exc)
        rec.error["t_ms"] = round((time.perf_counter() - t0) * 1000)
    for acc in calls.values():
        rec.tool_calls.append(asdict(acc))
    completes = [a.t_complete for a in calls.values() if a.t_complete is not None]
    rec.t_tool_complete = min(completes) if completes else None
    if keep_raw:
        rec.raw_chunks = raw
    return rec


RETRYABLE = {429, 500, 502, 503, 504}


async def record_stream_retry(client: Mistral, *, attempts: int = 4, keep_raw: bool = False, **kwargs: Any) -> tuple[StreamRecord, list[dict[str, Any]]]:
    """record_stream, retried on 429/5xx after a short wait. Returns the last record and the errors seen."""
    errors: list[dict[str, Any]] = []
    for attempt in range(attempts):
        rec = await record_stream(client, keep_raw=keep_raw, **kwargs)
        if not rec.error or rec.error.get("status") not in RETRYABLE:
            return rec, errors
        errors.append(rec.error)
        await asyncio.sleep(1.5 * (attempt + 1))
    return rec, errors


async def timed_complete(client: Mistral, **kwargs: Any) -> tuple[float, Any, dict[str, Any] | None]:
    """Run one non-streaming chat.complete_async call. Returns (seconds, response, error)."""
    t0 = time.perf_counter()
    try:
        resp = await client.chat.complete_async(**kwargs)
    except (HTTPValidationError, SDKError) as exc:
        return time.perf_counter() - t0, None, api_error(exc)
    return time.perf_counter() - t0, resp, None


async def pause(seconds: float = 0.3) -> None:
    """Small gap between sequential calls, to stay clear of rate limits."""
    await asyncio.sleep(seconds)
