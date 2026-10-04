"""Joins streamed tool-call fragments into complete calls, by index (spec 001)."""

import uuid
from dataclasses import dataclass, field

from app.conversation.stream import ToolCallFragment


@dataclass(frozen=True)
class ToolCall:
    id: str
    name: str
    arguments: str


@dataclass
class _Part:
    id: str | None = None
    name: str | None = None
    arguments: list[str] = field(default_factory=list)


class ToolCallAccumulator:
    def __init__(self) -> None:
        self._parts: dict[int, _Part] = {}

    def add(self, fragment: ToolCallFragment) -> None:
        part = self._parts.setdefault(fragment.index, _Part())
        if fragment.id:
            part.id = fragment.id
        if fragment.name:
            part.name = fragment.name
        if fragment.arguments:
            part.arguments.append(fragment.arguments)

    def complete(self) -> list[ToolCall]:
        calls = []
        for index in sorted(self._parts):
            part = self._parts[index]
            if not part.name:
                continue
            calls.append(
                ToolCall(
                    id=part.id or uuid.uuid4().hex[:9],
                    name=part.name,
                    arguments="".join(part.arguments) or "{}",
                )
            )
        return calls
