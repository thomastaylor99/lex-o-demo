"""What the loop needs from a chat model: text and tool-call fragments, as they stream."""

from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any, Protocol

ToolChoice = str | dict[str, Any]


@dataclass(frozen=True)
class ToolCallFragment:
    index: int
    id: str | None = None
    name: str | None = None
    arguments: str = ""


@dataclass(frozen=True)
class StreamDelta:
    content: str | None = None
    tool_calls: tuple[ToolCallFragment, ...] = ()


class ChatStreamer(Protocol):
    def stream(
        self,
        *,
        model: str,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None,
        tool_choice: ToolChoice | None,
    ) -> AsyncIterator[StreamDelta]: ...
