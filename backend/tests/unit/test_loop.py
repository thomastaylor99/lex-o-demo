"""Conversation loop (spec 001): one visitor turn, streamed as typed events."""

import asyncio
import json
from typing import Any

import pytest

from app.conversation.agent import UiEvent
from app.conversation.events import (
    AgentSwitched,
    AnyEvent,
    ErrorEvent,
    LinePlay,
    ProductsShown,
    ProfileUpdated,
    TextDelta,
    ToolFinished,
    ToolStarted,
    TurnDone,
)
from app.conversation.loop import run_turn
from app.conversation.session import Session, SessionStore
from app.conversation.stream import StreamDelta, ToolCallFragment
from tests.unit.fakes import (
    AGENTS,
    ALPHA,
    BETA,
    LOOK,
    FakeClock,
    ScriptedStreamer,
    reply,
    tool_call,
)

LOOK_ARGS = '{"query": "serum"}'


@pytest.fixture
def session() -> Session:
    return SessionStore(first_agent="alpha", ttl_s=60).create()


async def run(
    session: Session, streamer: ScriptedStreamer, user_text: str = "Hello", **options: Any
) -> list[AnyEvent]:
    """Run one turn and collect its events, which share one turn id and arrive in time order."""
    turn = run_turn(
        session, user_text, agents=AGENTS, streamer=streamer, clock=FakeClock(), **options
    )
    events = [event async for event in turn]
    assert len({event.turn_id for event in events}) == 1
    assert [event.t_ms for event in events] == sorted(event.t_ms for event in events)
    return events


def kinds(events: list[AnyEvent]) -> list[str]:
    return [event.type for event in events]


def first[E](events: list[AnyEvent], kind: type[E]) -> E:
    return next(event for event in events if isinstance(event, kind))


def tool_messages(session: Session) -> list[dict[str, Any]]:
    return [message for message in session.history if message["role"] == "tool"]


def split_at_context(
    messages: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """The messages before the per-turn context block, and the block itself."""
    latest_user = max(i for i, message in enumerate(messages) if message["role"] == "user")
    return messages[: latest_user - 1], messages[latest_user - 1]


async def slow_observer(
    session: Session, user_text: str, previous_reply: str | None
) -> list[UiEvent]:
    await asyncio.sleep(0.5)
    return [UiEvent(type="profile.updated", payload={"profile": {"late": True}})]


async def failing_observer(
    session: Session, user_text: str, previous_reply: str | None
) -> list[UiEvent]:
    raise RuntimeError("extractor down")


async def test_text_only_turn_streams_deltas_and_records_the_reply(session: Session) -> None:
    streamer = ScriptedStreamer([reply("Hello", " there.")])

    events = await run(session, streamer, "Hi")

    assert kinds(events) == ["turn.started", "text.delta", "text.delta", "turn.done"]
    assert [event.text for event in events if isinstance(event, TextDelta)] == ["Hello", " there."]
    assert session.history == [
        {"role": "user", "content": "Hi"},
        {"role": "assistant", "content": "Hello there."},
    ]
    assert first(events, TurnDone).timings.model_calls[0].first_token_ms is not None


async def test_tool_round_runs_the_tool_and_feeds_its_result_back(session: Session) -> None:
    split_call = [
        StreamDelta(
            tool_calls=(ToolCallFragment(index=0, id="call_1", name="look", arguments='{"query'),)
        ),
        StreamDelta(tool_calls=(ToolCallFragment(index=0, arguments='": "serum"}'),)),
    ]
    streamer = ScriptedStreamer([split_call, reply("Here it is.")])

    events = await run(session, streamer)

    assert kinds(events) == [
        "turn.started",
        "line.play",
        "tool.started",
        "tool.finished",
        "products.shown",
        "text.delta",
        "turn.done",
    ]
    assert first(events, ToolStarted).args == {"query": "serum"}
    assert first(events, ToolFinished).ok is True
    shown = first(events, ProductsShown)
    assert shown.turn_id == events[0].turn_id
    assert shown.t_ms > 0
    assert (shown.products, shown.best_match_id) == ([{"id": "p1"}], "p1")
    assert streamer.calls[1]["messages"][-2:] == [
        {
            "role": "assistant",
            "content": "",
            "tool_calls": [
                {
                    "id": "call_1",
                    "type": "function",
                    "function": {"name": "look", "arguments": LOOK_ARGS},
                }
            ],
        },
        {
            "role": "tool",
            "tool_call_id": "call_1",
            "name": "look",
            "content": '{"products": ["p1"]}',
        },
    ]


async def test_filler_plays_before_a_tool_called_before_any_text(session: Session) -> None:
    streamer = ScriptedStreamer([[tool_call("look", LOOK_ARGS)], reply("Here it is.")])

    events = await run(session, streamer)

    assert kinds(events)[1:3] == ["line.play", "tool.started"]
    filler = first(events, LinePlay)
    assert (filler.agent, filler.line) == ("alpha", "filler")


async def test_no_filler_once_the_agent_has_spoken(session: Session) -> None:
    streamer = ScriptedStreamer(
        [[StreamDelta(content="Let me look."), tool_call("look", LOOK_ARGS)], reply("Here.")]
    )

    events = await run(session, streamer)

    assert "tool.started" in kinds(events)
    assert "line.play" not in kinds(events)


async def test_switch_hands_the_rest_of_the_turn_to_the_new_agent(session: Session) -> None:
    session.turn_index = 1
    session.history = [
        {"role": "user", "content": "Earlier"},
        {
            "role": "assistant",
            "content": "",
            "tool_calls": [
                {"id": "old", "type": "function", "function": {"name": "move", "arguments": "{}"}}
            ],
        },
        {"role": "tool", "tool_call_id": "old", "name": "move", "content": '{"ok": true}'},
    ]
    streamer = ScriptedStreamer([[tool_call("move")], reply("Beta here.")])

    events = await run(session, streamer, "I need an expert")

    assert kinds(events) == [
        "turn.started",
        "tool.started",
        "tool.finished",
        "line.play",
        "agent.switched",
        "text.delta",
        "turn.done",
    ]
    handover = first(events, LinePlay)
    assert (handover.agent, handover.line) == ("alpha", "handover")
    switched = first(events, AgentSwitched)
    assert (switched.from_agent, switched.to_agent) == ("alpha", "beta")
    assert first(events, TextDelta).agent == "beta"
    assert session.active_agent == "beta"
    assert session.active_since_turn == session.turn_index == 2
    beta_call = streamer.calls[1]
    assert beta_call["model"] == BETA.model
    assert beta_call["tools"] == [LOOK.schema()]
    assert beta_call["messages"][0] == {"role": "system", "content": BETA.instructions}
    assert session.history == [
        {"role": "user", "content": "Earlier"},
        {"role": "user", "content": "I need an expert"},
        {"role": "assistant", "content": "Beta here."},
    ]


async def test_end_turn_tool_plays_its_line_and_calls_the_model_no_more(session: Session) -> None:
    streamer = ScriptedStreamer([[tool_call("stop")], reply("Never said.")])

    events = await run(session, streamer)

    assert kinds(events) == [
        "turn.started",
        "tool.started",
        "tool.finished",
        "line.play",
        "turn.done",
    ]
    assert first(events, LinePlay).line == "clarify"
    assert len(streamer.calls) == 1


async def test_round_cap_makes_the_last_model_call_answer_without_tools(session: Session) -> None:
    looks = [[tool_call("look", LOOK_ARGS, call_id=f"call_{n}")] for n in range(3)]
    streamer = ScriptedStreamer([*looks, reply("Here are three.")])

    events = await run(session, streamer)

    assert [call["tool_choice"] for call in streamer.calls] == ["auto", "auto", "auto", "none"]
    assert kinds(events)[-2:] == ["text.delta", "turn.done"]


async def test_observer_events_arrive_before_turn_done(session: Session) -> None:
    received: list[tuple[str, str | None]] = []

    async def observer(
        _session: Session, user_text: str, previous_reply: str | None
    ) -> list[UiEvent]:
        received.append((user_text, previous_reply))
        return [UiEvent(type="profile.updated", payload={"profile": {"skin_type": "dry"}})]

    session.history = [
        {"role": "user", "content": "Hi"},
        {"role": "assistant", "content": "How is your skin?"},
    ]

    events = await run(session, ScriptedStreamer([reply("Noted.")]), "Dry", observers=[observer])

    assert kinds(events)[-2:] == ["profile.updated", "turn.done"]
    assert first(events, ProfileUpdated).profile == {"skin_type": "dry"}
    assert received == [("Dry", "How is your skin?")]


async def test_slow_and_failing_observers_are_skipped(session: Session) -> None:
    events = await run(
        session,
        ScriptedStreamer([reply("Noted.")]),
        observers=[slow_observer, failing_observer],
        observer_timeout_s=0.05,
    )

    assert kinds(events) == ["turn.started", "text.delta", "turn.done"]


async def test_unknown_tool_fails_the_call_and_the_turn_goes_on(session: Session) -> None:
    streamer = ScriptedStreamer([[tool_call("dance")], reply("I cannot do that.")])

    events = await run(session, streamer)

    assert first(events, ToolFinished).ok is False
    assert "error" in json.loads(tool_messages(session)[0]["content"])
    assert len(streamer.calls) == 2
    assert kinds(events)[-2:] == ["text.delta", "turn.done"]


async def test_invalid_arguments_fail_the_call(session: Session) -> None:
    streamer = ScriptedStreamer([[tool_call("look", "{}")], reply("What are you looking for?")])

    events = await run(session, streamer)

    assert first(events, ToolFinished).ok is False
    assert json.loads(tool_messages(session)[0]["content"])["error"] == "invalid arguments"


async def test_streamer_failure_ends_the_turn_with_an_error(session: Session) -> None:
    streamer = ScriptedStreamer([[StreamDelta(content="Let me"), RuntimeError("stream reset")]])

    events = await run(session, streamer)

    assert kinds(events) == ["turn.started", "text.delta", "error", "turn.done"]
    error = first(events, ErrorEvent)
    assert (error.message, error.recoverable) == ("stream reset", True)


async def test_messages_keep_a_stable_prefix_before_the_context_block(session: Session) -> None:
    earlier = [
        {"role": "user", "content": "Hi"},
        {"role": "assistant", "content": "Hello, how can I help?"},
    ]
    session.history = list(earlier)
    streamer = ScriptedStreamer(
        [[tool_call("look", LOOK_ARGS)], reply("Here it is."), reply("Yes, it is gentle.")]
    )

    await run(session, streamer, "Show me a serum")
    await run(session, streamer, "Is it gentle?")

    instructions = {"role": "system", "content": ALPHA.instructions}
    calls = [call["messages"] for call in streamer.calls]
    assert [messages[0] for messages in calls] == [instructions] * 3
    layouts = [split_at_context(messages) for messages in calls]
    assert [context for _, context in layouts] == [
        {"role": "system", "content": "# Context\nTurn 1."},
        {"role": "system", "content": "# Context\nTurn 1."},
        {"role": "system", "content": "# Context\nTurn 2."},
    ]
    stable, _ = layouts[0]
    assert stable == [instructions, *earlier]
    assert calls[2][: len(stable)] == stable
