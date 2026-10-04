"""The concierge's forced handoff to a specialist agent (spec 002)."""

import json
from typing import Literal

from pydantic import BaseModel, Field

from app.conversation.agent import Tool, ToolResult
from app.conversation.session import Session


class TransferArgs(BaseModel):
    agent: Literal["skincare", "unclear"] = Field(
        description=(
            "The specialist to transfer the visitor to, or 'unclear' when what they are "
            "looking for is not yet clear enough to route."
        )
    )
    summary: str = Field(
        description=(
            "A short summary of what the visitor is looking for, for the next agent to pick up."
        )
    )


async def _handle_transfer(session: Session, args: TransferArgs) -> ToolResult:
    if args.agent == "unclear" and "clarified" not in session.flags:
        session.flags["clarified"] = True
        return ToolResult(
            content=json.dumps({"status": "clarify"}, ensure_ascii=False),
            line="clarify",
            end_turn=True,
        )
    session.flags["handover_summary"] = args.summary
    return ToolResult(
        content=json.dumps({"status": "transferred", "to": "skincare"}, ensure_ascii=False),
        switch_to="skincare",
        line="handover_skincare",
    )


def transfer_tool() -> Tool:
    return Tool(
        name="transfer_to_agent",
        description=(
            "Transfer the visitor to the right specialist agent, or flag that their need is "
            "still unclear."
        ),
        args_model=TransferArgs,
        handler=_handle_transfer,
    )
