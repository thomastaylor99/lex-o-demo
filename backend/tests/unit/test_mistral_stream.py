"""Tests for the Mistral chat streamer (spec 001, task T8).

Shapes for `to_delta` come from the chat spike's recorded chunks
(spikes/2026-10-04-chat-engine/results/expert_raw_chunks_run2.json and
probe_parallel_tool_calls.json): plain-string content, one whole tool call per
chunk, two parallel calls sharing a chunk with index 0 and 1, and a reasoning
chunk where `content` is a list with a `thinking` part and a `text` part.
"""

import asyncio
import json
from types import SimpleNamespace
from typing import Any

import pytest
from structlog.testing import capture_logs

from app.conversation.mistral_stream import MistralStreamer, to_delta
from app.conversation.stream import StreamDelta, ToolCallFragment

FALLBACK_MODEL = "mistral-medium-latest"
MAIN_MODEL = "mistral-small-latest"


def fake_tool_call(*, index: int, id: str, name: str, arguments: Any) -> SimpleNamespace:
    """A `delta.tool_calls[i]`-shaped object: `.id`, `.index`, `.function.name/.arguments`."""
    return SimpleNamespace(
        index=index,
        id=id,
        type="function",
        function=SimpleNamespace(name=name, arguments=arguments),
    )


def fake_event(
    *, content: Any = None, tool_calls: Any = None, has_choices: bool = True
) -> SimpleNamespace:
    """An `event`-shaped object: `.data.choices[0].delta`, or no choices at all."""
    if not has_choices:
        return SimpleNamespace(data=SimpleNamespace(choices=[]))
    delta = SimpleNamespace(content=content, tool_calls=tool_calls)
    return SimpleNamespace(data=SimpleNamespace(choices=[SimpleNamespace(delta=delta)]))


class FakeStream:
    """Stands in for the SDK's EventStreamAsync: async context manager, async iterator."""

    def __init__(self, events: list[Any], *, delay_before_first: float = 0.0) -> None:
        self._events = list(events)
        self._delay_before_first = delay_before_first
        self._first = True
        self.closed = False

    async def __aenter__(self) -> FakeStream:
        return self

    async def __aexit__(self, *exc_info: object) -> None:
        self.closed = True

    def __aiter__(self) -> FakeStream:
        return self

    async def __anext__(self) -> Any:
        if self._first and self._delay_before_first:
            await asyncio.sleep(self._delay_before_first)
        self._first = False
        if not self._events:
            raise StopAsyncIteration
        return self._events.pop(0)


class FailAfterFirstStream(FakeStream):
    """Yields its first event normally, then raises on every call after that."""

    async def __anext__(self) -> Any:
        if not self._first:
            raise RuntimeError("dropped mid-stream")
        return await super().__anext__()


class FakeChat:
    """Replays one scripted behavior per call: raise an exception, or return a stream."""

    def __init__(self, behaviors: list[BaseException | FakeStream]) -> None:
        self._behaviors = list(behaviors)
        self.calls: list[dict[str, Any]] = []

    async def stream_async(self, **kwargs: Any) -> FakeStream:
        self.calls.append(kwargs)
        behavior = self._behaviors.pop(0)
        if isinstance(behavior, BaseException):
            raise behavior
        return behavior


class FakeClient:
    """Duck-types the one attribute MistralStreamer touches: client.chat.stream_async."""

    def __init__(self, behaviors: list[BaseException | FakeStream]) -> None:
        self.chat = FakeChat(behaviors)


def make_streamer(client: FakeClient, *, first_token_timeout_s: float = 0.05) -> MistralStreamer:
    return MistralStreamer(
        client,
        fallback_model=FALLBACK_MODEL,
        temperature=0.3,
        first_token_timeout_s=first_token_timeout_s,
    )


# -- to_delta: pure mapping from one choices[0].delta to a StreamDelta --------


def test_to_delta_text_only():
    delta = SimpleNamespace(content="Thank", tool_calls=None)

    assert to_delta(delta) == StreamDelta(content="Thank", tool_calls=())


def test_to_delta_one_tool_call():
    delta = SimpleNamespace(
        content=None,
        tool_calls=[
            fake_tool_call(
                index=0,
                id="codUXzDJ5",
                name="search_products",
                arguments='{"category": "moisturiser", "skin_type": "dry"}',
            )
        ],
    )

    result = to_delta(delta)

    assert result.content is None
    assert result.tool_calls == (
        ToolCallFragment(
            index=0,
            id="codUXzDJ5",
            name="search_products",
            arguments='{"category": "moisturiser", "skin_type": "dry"}',
        ),
    )


def test_to_delta_two_parallel_tool_calls_index_0_and_1():
    delta = SimpleNamespace(
        content=None,
        tool_calls=[
            fake_tool_call(
                index=0,
                id="wm5JHAiQ6",
                name="search_products",
                arguments='{"category": "moisturiser"}',
            ),
            fake_tool_call(
                index=1,
                id="7x3lhiMkk",
                name="search_products",
                arguments='{"category": "cleanser"}',
            ),
        ],
    )

    result = to_delta(delta)

    assert [f.index for f in result.tool_calls] == [0, 1]
    assert [f.id for f in result.tool_calls] == ["wm5JHAiQ6", "7x3lhiMkk"]
    assert [f.arguments for f in result.tool_calls] == [
        '{"category": "moisturiser"}',
        '{"category": "cleanser"}',
    ]


def test_to_delta_dict_arguments_are_json_dumped():
    delta = SimpleNamespace(
        content=None,
        tool_calls=[
            fake_tool_call(
                index=0,
                id="abc123xyz",
                name="search_products",
                arguments={"category": "moisturiser"},
            )
        ],
    )

    result = to_delta(delta)

    assert result.tool_calls[0].arguments == json.dumps({"category": "moisturiser"})


def test_to_delta_list_content_keeps_text_and_drops_thinking():
    # Shape from the reasoning probe: the switch-to-speech chunk holds an empty
    # thinking part plus a text part; thinking must never surface as content.
    delta = SimpleNamespace(
        content=[
            SimpleNamespace(type="thinking", thinking=[]),
            SimpleNamespace(type="text", text="That sounds"),
        ],
        tool_calls=None,
    )

    assert to_delta(delta) == StreamDelta(content="That sounds", tool_calls=())


def test_to_delta_thinking_only_list_content_gives_no_text():
    delta = SimpleNamespace(
        content=[
            SimpleNamespace(
                type="thinking", thinking=[SimpleNamespace(type="text", text="reasoning...")]
            ),
        ],
        tool_calls=None,
    )

    assert to_delta(delta) == StreamDelta(content=None, tool_calls=())


# -- MistralStreamer.stream: retry, fallback, timeout, error propagation -----


async def test_retries_once_on_same_model_then_succeeds():
    client = FakeClient(
        [
            RuntimeError("503 Service unavailable"),
            FakeStream([fake_event(has_choices=False), fake_event(content="Hi")]),
        ]
    )
    streamer = make_streamer(client)

    with capture_logs() as logs:
        deltas = [
            d
            async for d in streamer.stream(
                model=MAIN_MODEL, messages=[], tools=None, tool_choice=None
            )
        ]

    assert [d.content for d in deltas] == ["Hi"]  # the no-choices chunk was skipped
    assert [call["model"] for call in client.chat.calls] == [MAIN_MODEL, MAIN_MODEL]
    assert any(log["event"] == "llm_retry" and log["model"] == MAIN_MODEL for log in logs)


async def test_falls_back_to_fallback_model_when_both_same_model_attempts_fail():
    client = FakeClient(
        [
            RuntimeError("503 Service unavailable"),
            RuntimeError("503 Service unavailable"),
            FakeStream([fake_event(content="Hi")]),
        ]
    )
    streamer = make_streamer(client)

    with capture_logs() as logs:
        deltas = [
            d
            async for d in streamer.stream(
                model=MAIN_MODEL, messages=[], tools=None, tool_choice=None
            )
        ]

    assert [d.content for d in deltas] == ["Hi"]
    assert [call["model"] for call in client.chat.calls] == [MAIN_MODEL, MAIN_MODEL, FALLBACK_MODEL]
    assert any(log["event"] == "llm_fallback" and log["model"] == FALLBACK_MODEL for log in logs)


async def test_timeout_before_first_delta_counts_as_a_failure_and_retries():
    slow_stream = FakeStream([fake_event(content="too late")], delay_before_first=1.0)
    good_stream = FakeStream([fake_event(content="Hi")])
    client = FakeClient([slow_stream, good_stream])
    streamer = make_streamer(client, first_token_timeout_s=0.02)

    deltas = [
        d
        async for d in streamer.stream(model=MAIN_MODEL, messages=[], tools=None, tool_choice=None)
    ]

    assert [d.content for d in deltas] == ["Hi"]
    assert len(client.chat.calls) == 2
    assert slow_stream.closed is True  # closed on timeout, not left hanging


async def test_error_after_a_delta_was_yielded_propagates_without_retry():
    stream = FailAfterFirstStream([fake_event(content="Hi")])
    client = FakeClient([stream])  # one behavior only: a retry would raise IndexError
    streamer = make_streamer(client)

    collected: list[StreamDelta] = []
    with pytest.raises(RuntimeError, match="dropped mid-stream"):
        async for delta in streamer.stream(
            model=MAIN_MODEL, messages=[], tools=None, tool_choice=None
        ):
            collected.append(delta)

    assert [d.content for d in collected] == ["Hi"]
    assert len(client.chat.calls) == 1
    assert stream.closed is True
