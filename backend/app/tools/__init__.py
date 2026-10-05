"""Builds the tools the agents call over the catalogue, basket and profile (spec 002)."""

from mistralai.client import Mistral

from app.catalogue.store import Catalogue
from app.conversation.agent import Tool
from app.tools.basket import basket_tool
from app.tools.catalogue_tools import catalogue_tools
from app.tools.profile_tools import profile_tool
from app.tools.recap_tools import recap_tool
from app.tools.transfer import transfer_tool
from app.tools.tutorials import tutorials_tool


def build_tools(
    catalogue: Catalogue, client: Mistral | None = None, recap_model: str = "mistral-small-latest"
) -> dict[str, Tool]:
    search_products, get_routine = catalogue_tools(catalogue)
    tools = (
        transfer_tool(),
        search_products,
        get_routine,
        basket_tool(catalogue),
        profile_tool(),
        tutorials_tool(catalogue),
        recap_tool(client, recap_model, catalogue=catalogue),
    )
    return {tool.name: tool for tool in tools}
