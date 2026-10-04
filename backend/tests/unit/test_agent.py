"""Tests for agent and tool interfaces (spec 001)."""

from __future__ import annotations

from enum import StrEnum
from typing import Any

import pytest
from pydantic import BaseModel, Field, ValidationError

from app.conversation.agent import AgentConfig, Tool, UiEvent, force


class Size(StrEnum):
    small = "small"
    large = "large"


class Shade(StrEnum):
    light = "light"
    dark = "dark"


class SearchArgs(BaseModel):
    size: Size = Field(description="Product size")
    shade: Shade | None = None


class RecursiveArgs(BaseModel):
    name: str
    child: RecursiveArgs | None = None


async def _handler(session: Any, args: Any) -> Any:  # pragma: no cover - never called
    raise NotImplementedError


def _contains_ref_or_defs(node: Any) -> bool:
    """Recursively search a JSON-schema-like structure for $ref or $defs keys."""
    if isinstance(node, dict):
        if "$ref" in node or "$defs" in node:
            return True
        return any(_contains_ref_or_defs(value) for value in node.values())
    if isinstance(node, list):
        return any(_contains_ref_or_defs(item) for item in node)
    return False


def _make_tool(args_model: type[BaseModel] = SearchArgs) -> Tool:
    return Tool(
        name="search",
        description="Search the catalogue.",
        args_model=args_model,
        handler=_handler,
    )


def test_tool_schema_has_no_refs_or_defs_and_inlines_enum_values():
    schema = _make_tool().schema()

    assert not _contains_ref_or_defs(schema)
    schema_text = str(schema)
    assert "small" in schema_text
    assert "large" in schema_text
    assert "light" in schema_text
    assert "dark" in schema_text


def test_tool_schema_keeps_sibling_keys_next_to_an_inlined_enum():
    schema = _make_tool().schema()

    size_property = schema["function"]["parameters"]["properties"]["size"]

    assert size_property == {
        "enum": ["small", "large"],
        "title": "Size",
        "type": "string",
        "description": "Product size",
    }


def test_tool_schema_rejects_a_self_referencing_args_model():
    tool = _make_tool(args_model=RecursiveArgs)

    with pytest.raises(ValueError, match="recursive"):
        tool.schema()


def test_force_builds_a_forced_tool_choice():
    assert force("transfer_to_agent") == {
        "type": "function",
        "function": {"name": "transfer_to_agent"},
    }


def test_agent_config_tool_lookup_hit_and_miss():
    tool = _make_tool()
    config = AgentConfig(
        id="concierge",
        display_name={"en": "Concierge", "fr": "Concierge"},
        role_label={"en": "Host", "fr": "Hote"},
        model="mistral-small-latest",
        instructions="Greet the visitor.",
        tools=(tool,),
        tool_choice=lambda session: "auto",
        voices={"en": "voice-en", "fr": "voice-fr"},
        lines={},
        context_block=lambda session: "",
    )

    assert config.tool("search") is tool
    assert config.tool("missing") is None


def test_ui_event_accepts_a_payload_matching_its_event_type():
    event = UiEvent(type="products.shown", payload={"products": [{"id": "p1"}]})

    assert event.payload == {"products": [{"id": "p1"}]}


def test_ui_event_rejects_a_payload_that_does_not_match_its_event_type():
    with pytest.raises(ValidationError):
        UiEvent(type="products.shown", payload={"items": []})


def test_ui_event_rejects_a_payload_carrying_a_reserved_key():
    with pytest.raises(ValidationError):
        UiEvent(type="products.shown", payload={"turn_id": "sneaky"})
