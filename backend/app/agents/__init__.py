"""The two agent configurations the conversation loop switches between (spec 002)."""

from collections.abc import Mapping

from app.agents.concierge import build_concierge
from app.agents.skincare import build_skincare
from app.conversation.agent import AgentConfig, Tool
from app.settings import Settings

FIRST_AGENT = "concierge"


def build_agents(settings: Settings, tools: Mapping[str, Tool]) -> dict[str, AgentConfig]:
    agents = (
        build_concierge(settings.agent_model, tools),
        build_skincare(settings.agent_model, tools),
    )
    return {agent.id: agent for agent in agents}
