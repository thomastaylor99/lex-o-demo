"""The skincare expert: diagnoses, searches the catalogue and builds a routine (spec 002)."""

import json
import re
from collections.abc import Mapping

from app.agents.prompts import LINES, SKINCARE_INSTRUCTIONS
from app.agents.voices import SKINCARE_VOICES
from app.conversation.agent import AgentConfig, Tool, force
from app.conversation.session import Session
from app.conversation.stream import ToolChoice
from app.lang import LANGUAGE_NAMES

# Expert turns (since the handoff) without a search before the loop forces one.
TURNS_BEFORE_FORCED_SEARCH = 4

# A named skin condition or a request for a cure, in English or French (claims policy).
MEDICAL = re.compile(
    r"eczema|eczéma|psoria|rosacea|rosacée|\bacne\b|\bacné|dermatit|allerg|\brash|urticai"
    r"|\bcure|\bheal|guéri|soigne",
    re.IGNORECASE,
)
TUTORIALS_NOTE = (
    "The routine is in the basket and no tutorials are on screen yet: call show_tutorials now "
    "with the ids of the products in the basket, and mention the tutorials in one sentence."
)
MEDICAL_NOTE = (
    "The visitor named a skin condition or asked for a cure. Start the reply by saying you can't "
    "give medical advice and that a pharmacist or a dermatologist is the right person to ask, "
    "then offer help with products for their skin type."
)


def _tool_choice(session: Session) -> ToolChoice:
    expert_turns = session.turn_index - session.active_since_turn
    if "last_search_turn" not in session.flags and expert_turns >= TURNS_BEFORE_FORCED_SEARCH:
        return force("search_products")
    return "auto"


def _context_block(session: Session) -> str:
    profile = session.profile.model_dump(mode="json", exclude_none=True, exclude_defaults=True)
    shown_ids = session.flags.get("shown_ids", [])
    return "\n".join(
        [
            f"Reply language: {LANGUAGE_NAMES[session.language]}.",
            f"Concierge summary: {session.flags.get('handover_summary') or 'none'}",
            f"Visitor profile so far: {json.dumps(profile, ensure_ascii=False)}",
            f"Basket: {json.dumps(session.basket.view(), ensure_ascii=False)}",
            f"Products already shown: {', '.join(shown_ids) or 'none'}",
            *([TUTORIALS_NOTE] if _tutorials_due(session) else []),
            *([MEDICAL_NOTE] if MEDICAL.search(_latest_visitor_text(session)) else []),
        ]
    )


def _tutorials_due(session: Session) -> bool:
    """A routine (two products or more) is in the basket and its tutorials were never shown."""
    return len(session.basket.items) >= 2 and not session.flags.get("shown_tutorials")


def _latest_visitor_text(session: Session) -> str:
    return next((m["content"] for m in reversed(session.history) if m["role"] == "user"), "")


def build_skincare(model: str, tools: Mapping[str, Tool]) -> AgentConfig:
    return AgentConfig(
        id="skincare",
        display_name={"en": "Skincare expert", "fr": "Experte soin"},
        role_label={"en": "Skincare", "fr": "Soin"},
        model=model,
        instructions=SKINCARE_INSTRUCTIONS,
        tools=(
            tools["search_products"],
            tools["get_routine"],
            tools["add_to_basket"],
            tools["save_profile"],
            tools["show_tutorials"],
            tools["send_recap"],
        ),
        tool_choice=_tool_choice,
        voices=SKINCARE_VOICES,
        lines=LINES["skincare"],
        context_block=_context_block,
        tool_fillers={
            "search_products": "filler_search",
            "get_routine": "filler_search",
            "send_recap": "filler_recap",
        },
    )
