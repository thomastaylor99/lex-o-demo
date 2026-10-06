"""The conversation loop (spec 001): one visitor turn, streamed as events.

It knows agents, tools and events. Beauty lives in the agent configs, tools and observers
the caller passes in.
"""

import asyncio
import json
import time
import uuid
from collections.abc import AsyncIterator, Callable, Mapping, Sequence
from typing import Any

import structlog
from pydantic import ValidationError

from app.conversation.accumulate import ToolCall, ToolCallAccumulator
from app.conversation.agent import AgentConfig, Observer, Tool, ToolResult, UiEvent
from app.conversation.events import (
    EVENT_ADAPTER,
    AgentSwitched,
    AnyEvent,
    ErrorEvent,
    LinePlay,
    ModelCallTiming,
    TextDelta,
    TextDone,
    ToolFinished,
    ToolStarted,
    ToolTiming,
    TurnDone,
    TurnStarted,
    TurnTimings,
)
from app.conversation.session import Session
from app.conversation.stream import ChatStreamer, ToolChoice

log = structlog.get_logger()


async def run_turn(
    session: Session,
    user_text: str,
    *,
    agents: Mapping[str, AgentConfig],
    streamer: ChatStreamer,
    observers: Sequence[Observer] = (),
    observer_timeout_s: float = 3.0,
    max_rounds: int = 3,
    clock: Callable[[], float] = time.perf_counter,
) -> AsyncIterator[AnyEvent]:
    turn_id = uuid.uuid4().hex[:12]
    t0 = clock()

    def ms() -> int:
        return int((clock() - t0) * 1000)

    timings = TurnTimings()
    previous_reply = _last_assistant_text(session.history)
    session.turn_index += 1
    session.history.append({"role": "user", "content": user_text})
    yield TurnStarted(
        turn_id=turn_id, t_ms=0, agent=session.active_agent, language=session.language
    )

    tasks = [asyncio.create_task(obs(session, user_text, previous_reply)) for obs in observers]
    spoken = False
    rounds = 0
    force_tool = False  # the last reply promised an action without taking it
    held = ""  # that reply's words, kept for the forced call's message
    try:
        while True:
            agent = agents[session.active_agent]
            offered = agent.tools
            if rounds >= max_rounds:
                choice: ToolChoice = "none"
            elif force_tool:
                choice = "any"
            else:
                choice = agent.tool_choice(session)
                if choice == "none":
                    # Shown tools it could not call, the model wrote the call out as text, which
                    # the voice would read (golden run, 2026-10-05): it gets none to see.
                    offered = ()
            acc = ToolCallAccumulator()
            parts: list[str] = []
            started = clock()
            first: float | None = None
            async for delta in streamer.stream(
                model=agent.model,
                messages=_messages(agent, session),
                tools=[t.schema() for t in offered] or None,
                tool_choice=choice if offered else None,
            ):
                if delta.usage is not None:
                    session.usage.add_llm(delta.model or agent.model, delta.usage)
                if first is None and (delta.content or delta.tool_calls):
                    first = clock()
                if delta.content:
                    parts.append(delta.content)
                    spoken = True
                    yield TextDelta(turn_id=turn_id, t_ms=ms(), agent=agent.id, text=delta.content)
                for fragment in delta.tool_calls:
                    acc.add(fragment)
            timings.model_calls.append(
                ModelCallTiming(
                    agent=agent.id,
                    first_token_ms=None if first is None else int((first - started) * 1000),
                    duration_ms=int((clock() - started) * 1000),
                )
            )
            calls = acc.complete()
            text = "".join(parts)
            if text and not calls and agent.vet_reply is not None:
                text = agent.vet_reply(session, text)
            if text:
                # The browser speaks the whole text in one request now, before any tool runs and
                # before the turn waits for its observers (spec 001).
                yield TextDone(turn_id=turn_id, t_ms=ms(), agent=agent.id, text=text)
            said, held = held + text, ""
            if not calls:
                # A reply that promises an action before any tool ran in this turn, with tools
                # allowed, acts now. After a tool, "I'll add it" narrates what was done.
                if (
                    text
                    and not force_tool
                    and rounds == 0
                    and choice != "none"
                    and agent.promises_action is not None
                    and agent.promises_action(text)
                ):
                    # Its words join the forced call's message: the API takes no assistant
                    # message last.
                    held = text
                    force_tool = True
                    continue
                if said:
                    session.history.append({"role": "assistant", "content": said})
                break
            force_tool = False
            session.history.append(
                {"role": "assistant", "content": said, "tool_calls": [_wire(c) for c in calls]}
            )
            rounds += 1
            switch_to: str | None = None
            switch_tools: set[str] = set()
            end_turn = False
            for call in calls:
                if call.name in agent.tool_fillers and not spoken:
                    spoken = True
                    yield LinePlay(
                        turn_id=turn_id,
                        t_ms=ms(),
                        agent=agent.id,
                        line=agent.tool_fillers[call.name],
                    )
                args = _parse_args(call.arguments)
                tool = agent.tool(call.name)
                public = tool.public_args(args) if tool and tool.public_args else args
                yield ToolStarted(
                    turn_id=turn_id, t_ms=ms(), call_id=call.id, name=call.name, args=public
                )
                tool_started = clock()
                result, ok = await _execute(agent.tool(call.name), session, call, args)
                duration = int((clock() - tool_started) * 1000)
                timings.tools.append(ToolTiming(name=call.name, duration_ms=duration))
                yield ToolFinished(
                    turn_id=turn_id,
                    t_ms=ms(),
                    call_id=call.id,
                    name=call.name,
                    ok=ok,
                    duration_ms=duration,
                )
                for ui in result.ui_events:
                    yield _stamp(ui, turn_id, ms())
                session.history.append(
                    {
                        "role": "tool",
                        "tool_call_id": call.id,
                        "name": call.name,
                        "content": result.content,
                    }
                )
                if result.line:
                    spoken = True
                    yield LinePlay(turn_id=turn_id, t_ms=ms(), agent=agent.id, line=result.line)
                if result.switch_to:
                    switch_to = result.switch_to
                    switch_tools.add(call.name)
                end_turn = end_turn or result.end_turn
            if switch_to is not None and switch_to in agents:
                _drop_tool_calls(session.history, switch_tools)
                yield AgentSwitched(
                    turn_id=turn_id, t_ms=ms(), from_agent=agent.id, to_agent=switch_to
                )
                session.active_agent = switch_to
                session.active_since_turn = session.turn_index
                rounds = 0
                continue
            if end_turn:
                break
    except Exception as exc:  # the browser always gets a turn.done
        log.exception("turn_failed", turn_id=turn_id)
        yield ErrorEvent(turn_id=turn_id, t_ms=ms(), message=str(exc), recoverable=True)
    for event in await _collect(tasks, observer_timeout_s, turn_id, ms):
        yield event
    timings.total_ms = ms()
    yield TurnDone(
        turn_id=turn_id,
        t_ms=timings.total_ms,
        timings=timings,
        cost_eur=session.usage.cost_eur(),
    )


async def _execute(
    tool: Tool | None, session: Session, call: ToolCall, args: dict[str, Any]
) -> tuple[ToolResult, bool]:
    if tool is None:
        return ToolResult(content=json.dumps({"error": f"unknown tool {call.name}"})), False
    try:
        parsed = tool.args_model.model_validate(args)
    except ValidationError as exc:
        detail = exc.errors(include_url=False, include_context=False)
        return ToolResult(
            content=json.dumps({"error": "invalid arguments", "detail": detail}, default=str)
        ), False
    try:
        return await tool.handler(session, parsed), True
    except Exception as exc:
        log.exception("tool_failed", tool=call.name)
        return ToolResult(content=json.dumps({"error": str(exc)})), False


async def _collect(
    tasks: list[asyncio.Task[list[UiEvent]]], timeout_s: float, turn_id: str, ms: Callable[[], int]
) -> list[AnyEvent]:
    if not tasks:
        return []
    done, pending = await asyncio.wait(tasks, timeout=timeout_s)
    for task in pending:
        task.cancel()
    events: list[AnyEvent] = []
    for task in done:
        if task.exception() is not None:
            log.warning("observer_failed", error=str(task.exception()))
            continue
        events.extend(_stamp(ui, turn_id, ms()) for ui in task.result())
    return events


def _messages(agent: AgentConfig, session: Session) -> list[dict[str, Any]]:
    """Stable instructions first, the per-turn context just before the latest visitor message.

    Mistral caches prompt prefixes automatically (about 90 ms per turn, chat spike), so
    everything before the context block stays byte-for-byte the same from turn to turn.
    """
    history = session.history
    last_user = max(i for i, m in enumerate(history) if m["role"] == "user")
    context = {"role": "system", "content": f"# Context\n{agent.context_block(session)}"}
    return [
        {"role": "system", "content": agent.instructions},
        *history[:last_user],
        context,
        *history[last_user:],
    ]


def _stamp(ui: UiEvent, turn_id: str, t_ms: int) -> AnyEvent:
    payload = ui.latest() if ui.latest is not None else ui.payload
    return EVENT_ADAPTER.validate_python(
        {"type": ui.type, "turn_id": turn_id, "t_ms": t_ms, **payload}
    )


def _wire(call: ToolCall) -> dict[str, Any]:
    return {
        "id": call.id,
        "type": "function",
        "function": {"name": call.name, "arguments": call.arguments},
    }


def _parse_args(arguments: str) -> dict[str, Any]:
    try:
        value = json.loads(arguments)
    except json.JSONDecodeError:
        return {}
    return value if isinstance(value, dict) else {}


def _last_assistant_text(history: list[dict[str, Any]]) -> str | None:
    for message in reversed(history):
        if message["role"] == "assistant" and message.get("content"):
            return message["content"]
    return None


def _drop_tool_calls(history: list[dict[str, Any]], names: set[str]) -> None:
    """Remove every call to the tools that switched agents, and their results.

    The new agent lacks those tools and reads the handover summary in its context block.
    """
    dropped: set[str] = set()
    kept: list[dict[str, Any]] = []
    for message in history:
        calls = message.get("tool_calls") or []
        switch_ids = {c["id"] for c in calls if c["function"]["name"] in names}
        if switch_ids:
            dropped |= switch_ids
            remaining = [c for c in calls if c["id"] not in switch_ids]
            if remaining:
                kept.append({**message, "tool_calls": remaining})
            elif message.get("content"):
                kept.append({"role": "assistant", "content": message["content"]})
            continue
        if message["role"] == "tool" and message.get("tool_call_id") in dropped:
            continue
        kept.append(message)
    history[:] = kept
