"""Test doubles for the conversation loop: a scripted chat model, two agents and a fake clock."""

import copy
from collections.abc import AsyncIterator, Sequence
from typing import Any

from pydantic import BaseModel

from app.conversation.agent import AgentConfig, Tool, ToolResult, UiEvent
from app.conversation.session import Session
from app.conversation.stream import StreamDelta, ToolCallFragment, ToolChoice


class ScriptedStreamer:
    """Plays one script per model call and records what each call was given.

    A script item that is an exception is raised when the stream reaches it.
    """

    def __init__(self, scripts: Sequence[Sequence[StreamDelta | Exception]]) -> None:
        self.scripts = list(scripts)
        self.calls: list[dict[str, Any]] = []

    async def stream(
        self,
        *,
        model: str,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None,
        tool_choice: ToolChoice | None,
    ) -> AsyncIterator[StreamDelta]:
        self.calls.append(
            {
                "model": model,
                "messages": copy.deepcopy(messages),
                "tools": tools,
                "tool_choice": tool_choice,
            }
        )
        for item in self.scripts.pop(0):
            if isinstance(item, Exception):
                raise item
            yield item


def reply(*chunks: str) -> list[StreamDelta]:
    """A model reply made of text deltas."""
    return [StreamDelta(content=chunk) for chunk in chunks]


def tool_call(name: str, arguments: str = "{}", call_id: str = "call_1") -> StreamDelta:
    """A delta carrying one complete tool call."""
    fragment = ToolCallFragment(index=0, id=call_id, name=name, arguments=arguments)
    return StreamDelta(tool_calls=(fragment,))


class FakeClock:
    """Moves forward a fixed step on every read, so t_ms values are deterministic."""

    def __init__(self, step_s: float = 0.01) -> None:
        self.step_s = step_s
        self.reads = 0

    def __call__(self) -> float:
        self.reads += 1
        return self.reads * self.step_s


class NoArgs(BaseModel):
    pass


class LookArgs(BaseModel):
    query: str


async def _move(session: Session, args: NoArgs) -> ToolResult:
    return ToolResult(content='{"ok": true}', switch_to="beta", line="handover")


async def _look(session: Session, args: LookArgs) -> ToolResult:
    shown = UiEvent(
        type="products.shown", payload={"products": [{"id": "p1"}], "best_match_id": "p1"}
    )
    return ToolResult(content='{"products": ["p1"]}', ui_events=[shown])


async def _stop(session: Session, args: NoArgs) -> ToolResult:
    return ToolResult(content="{}", line="clarify", end_turn=True)


MOVE = Tool(name="move", description="Hand the visitor to beta.", args_model=NoArgs, handler=_move)
LOOK = Tool(name="look", description="Show products.", args_model=LookArgs, handler=_look)
STOP = Tool(name="stop", description="Ask the visitor to repeat.", args_model=NoArgs, handler=_stop)

ALPHA = AgentConfig(
    id="alpha",
    display_name={"en": "Alpha", "fr": "Alpha"},
    role_label={"en": "Host", "fr": "Hôte"},
    model="alpha-model",
    instructions="You are alpha.",
    tools=(MOVE, LOOK, STOP),
    tool_choice=lambda session: "auto",
    voices={"en": "alpha-voice-en", "fr": "alpha-voice-fr"},
    lines={
        "handover": {"en": "Let me bring in beta.", "fr": "Je vous passe beta."},
        "clarify": {"en": "Could you say that again?", "fr": "Pouvez-vous répéter ?"},
        "filler": {"en": "One moment.", "fr": "Un instant."},
    },
    context_block=lambda session: f"Turn {session.turn_index}.",
    tool_fillers={"look": "filler"},
)

BETA = AgentConfig(
    id="beta",
    display_name={"en": "Beta", "fr": "Beta"},
    role_label={"en": "Expert", "fr": "Experte"},
    model="beta-model",
    instructions="You are beta.",
    tools=(LOOK,),
    tool_choice=lambda session: "auto",
    voices={"en": "beta-voice-en", "fr": "beta-voice-fr"},
    lines={"welcome": {"en": "Hello, I am beta.", "fr": "Bonjour, je suis beta."}},
    context_block=lambda session: f"Turn {session.turn_index}.",
)

AGENTS = {agent.id: agent for agent in (ALPHA, BETA)}
