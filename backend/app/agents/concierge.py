"""The beauty concierge: greets the visitor and forces a handoff to a specialist (spec 002)."""

from collections.abc import Mapping

from app.agents.prompts import CONCIERGE_INSTRUCTIONS, LINES
from app.agents.voices import CONCIERGE_VOICES
from app.conversation.agent import AgentConfig, Tool, force
from app.conversation.session import Session
from app.lang import LANGUAGE_NAMES


def _context_block(session: Session) -> str:
    return f"Reply language: {LANGUAGE_NAMES[session.language]}."


def build_concierge(model: str, tools: Mapping[str, Tool]) -> AgentConfig:
    return AgentConfig(
        id="concierge",
        display_name={"en": "Beauty concierge", "fr": "Concierge beauté"},
        role_label={"en": "Welcome", "fr": "Accueil"},
        model=model,
        instructions=CONCIERGE_INSTRUCTIONS,
        tools=(tools["transfer_to_agent"],),
        tool_choice=lambda s: force("transfer_to_agent"),
        voices=CONCIERGE_VOICES,
        lines=LINES["concierge"],
        context_block=_context_block,
        transfer_targets=("skincare",),
    )
