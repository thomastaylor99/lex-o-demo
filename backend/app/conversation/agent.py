"""Agent and tool interfaces the conversation loop reads (spec 001). Content lives in app.agents."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, Literal

from pydantic import BaseModel, Field, model_validator

from app.conversation.events import EVENT_ADAPTER
from app.conversation.stream import ToolChoice
from app.lang import Language

if TYPE_CHECKING:
    from app.conversation.session import Session


class UiEvent(BaseModel):
    """A browser event produced by a tool or an observer; the loop adds turn_id and t_ms."""

    type: Literal["products.shown", "basket.updated", "profile.updated"]
    payload: dict[str, Any]
    # Observer events go out at the end of the turn. When set, `latest` rebuilds the payload
    # then, so a tool that changed the same state mid-turn (consent) is not undone by a snapshot.
    latest: Callable[[], dict[str, Any]] | None = Field(default=None, exclude=True)

    @model_validator(mode="after")
    def _payload_fits_event(self) -> UiEvent:
        """Fail inside the tool or observer that built a bad payload, where errors are caught."""
        if self.payload.keys() & {"type", "turn_id", "t_ms"}:
            raise ValueError("payload must not set type, turn_id or t_ms")
        EVENT_ADAPTER.validate_python({"type": self.type, "turn_id": "", "t_ms": 0, **self.payload})
        return self


class ToolResult(BaseModel):
    content: str  # JSON text handed back to the model
    ui_events: list[UiEvent] = []
    switch_to: str | None = None  # agent id the loop switches to after this call
    line: str | None = None  # fixed line of the current agent to play now
    end_turn: bool = False  # stop the turn without another model call


ToolHandler = Callable[["Session", Any], Awaitable[ToolResult]]
Observer = Callable[["Session", str, "str | None"], Awaitable[list[UiEvent]]]


@dataclass(frozen=True)
class Tool:
    name: str
    description: str
    args_model: type[BaseModel]
    handler: ToolHandler

    def schema(self) -> dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": inline_refs(self.args_model.model_json_schema()),
            },
        }


@dataclass(frozen=True)
class AgentConfig:
    id: str
    display_name: dict[Language, str]
    role_label: dict[Language, str]
    model: str
    instructions: str
    tools: tuple[Tool, ...]
    tool_choice: Callable[[Session], ToolChoice]
    voices: dict[Language, str]
    lines: dict[str, dict[Language, str]]
    context_block: Callable[[Session], str]
    tool_fillers: dict[str, str] = field(default_factory=dict)
    transfer_targets: tuple[str, ...] = ()

    def tool(self, name: str) -> Tool | None:
        return next((t for t in self.tools if t.name == name), None)


def force(tool_name: str) -> dict[str, Any]:
    """tool_choice value that forces one named function."""
    return {"type": "function", "function": {"name": tool_name}}


def inline_refs(schema: dict[str, Any]) -> dict[str, Any]:
    """Replace $ref pointers with their $defs entries so a function schema stands alone.

    Keys next to a $ref (a field's description or default) are kept; a self-referencing
    model raises ValueError.
    """
    defs = schema.get("$defs", {})

    def resolve(node: Any, seen: tuple[str, ...] = ()) -> Any:
        if isinstance(node, dict):
            if "$ref" in node:
                name = node["$ref"].rsplit("/", 1)[-1]
                if name in seen:
                    raise ValueError(f"cannot inline recursive schema {name!r}")
                target = resolve(defs[name], (*seen, name))
                siblings = {k: resolve(v, seen) for k, v in node.items() if k != "$ref"}
                return {**target, **siblings}
            return {k: resolve(v, seen) for k, v in node.items() if k != "$defs"}
        if isinstance(node, list):
            return [resolve(v, seen) for v in node]
        return node

    result: dict[str, Any] = resolve(schema)
    return result
