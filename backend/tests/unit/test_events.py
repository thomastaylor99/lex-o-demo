"""Tests for the stream event contract (spec 001)."""

from typing import get_args

import pytest
from pydantic import ValidationError

from app.conversation.events import (
    EVENT_ADAPTER,
    AgentSwitched,
    AnyEvent,
    BasketUpdated,
    ErrorEvent,
    LinePlay,
    ModelCallTiming,
    ProductsShown,
    ProfileUpdated,
    RecapReady,
    TextDelta,
    TextDone,
    ToolFinished,
    ToolStarted,
    ToolTiming,
    TurnDone,
    TurnStarted,
    TurnTimings,
    TutorialsShown,
    to_sse,
)

ALL_EVENTS = [
    TurnStarted(turn_id="t1", t_ms=0, agent="concierge", language="en"),
    TextDelta(turn_id="t1", t_ms=10, agent="concierge", text="Hello"),
    TextDone(turn_id="t1", t_ms=12, agent="concierge", text="Hello"),
    ToolStarted(
        turn_id="t1", t_ms=20, call_id="c1", name="search_products", args={"query": "cream"}
    ),
    ToolFinished(
        turn_id="t1", t_ms=30, call_id="c1", name="search_products", ok=True, duration_ms=15
    ),
    LinePlay(turn_id="t1", t_ms=40, agent="concierge", line="Welcome!"),
    AgentSwitched(turn_id="t1", t_ms=50, from_agent="concierge", to_agent="skincare"),
    ProductsShown(turn_id="t1", t_ms=60, products=[{"id": "p1"}], best_match_id="p1"),
    BasketUpdated(turn_id="t1", t_ms=70, items=[{"id": "p1", "qty": 1}], total_eur=24.9),
    ProfileUpdated(turn_id="t1", t_ms=80, profile={"skin_type": "dry"}),
    TutorialsShown(turn_id="t1", t_ms=82, tutorials=[{"id": "v1", "platform": "youtube"}]),
    RecapReady(
        turn_id="t1",
        t_ms=84,
        email_masked="c***@example.com",
        subject="Your routine",
        body="Hello Camille.",
        coupon={"code": "LEX-4F7K", "label": "Example offer", "valid_until": "2026-11-07"},
    ),
    TurnDone(
        turn_id="t1",
        t_ms=90,
        timings=TurnTimings(
            model_calls=[ModelCallTiming(agent="concierge", first_token_ms=120, duration_ms=300)],
            tools=[ToolTiming(name="search_products", duration_ms=15)],
            total_ms=300,
        ),
        cost_eur=0.0123,
    ),
    ErrorEvent(turn_id="t1", t_ms=100, message="boom", recoverable=True),
]


def test_all_event_classes_are_covered():
    """Every member of the AnyEvent union has at least one instance under test here."""
    assert {type(event) for event in ALL_EVENTS} == set(get_args(AnyEvent))


@pytest.mark.parametrize("event", ALL_EVENTS, ids=[e.type for e in ALL_EVENTS])
def test_event_round_trips_through_the_adapter(event):
    assert EVENT_ADAPTER.validate_json(event.model_dump_json()) == event


def test_to_sse_formats_one_frame():
    event = TextDelta(turn_id="t", t_ms=5, agent="skincare", text="Hi")

    assert to_sse(event) == (
        'event: text.delta\ndata: {"turn_id":"t","t_ms":5,"type":"text.delta",'
        '"agent":"skincare","text":"Hi"}\n\n'
    )


def test_to_sse_escapes_embedded_newline_onto_one_data_line():
    event = TextDelta(turn_id="t", t_ms=5, agent="skincare", text="a\nb")

    assert to_sse(event) == (
        'event: text.delta\ndata: {"turn_id":"t","t_ms":5,"type":"text.delta",'
        '"agent":"skincare","text":"a\\nb"}\n\n'
    )


def test_unknown_event_type_is_rejected():
    with pytest.raises(ValidationError):
        EVENT_ADAPTER.validate_json('{"type": "nope", "turn_id": "t", "t_ms": 0}')


def test_negative_t_ms_is_rejected():
    with pytest.raises(ValidationError):
        TurnStarted(turn_id="t", t_ms=-1, agent="concierge", language="en")


def test_extra_key_is_rejected():
    with pytest.raises(ValidationError):
        TurnStarted(turn_id="t", t_ms=0, agent="concierge", language="en", bogus="nope")
