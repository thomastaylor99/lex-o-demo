"""Tutorial videos for the chosen products, from brands and creators (spec 006)."""

import json
from typing import Any

from pydantic import BaseModel, Field

from app.catalogue.store import Catalogue
from app.catalogue.tutorials import Tutorial, TutorialBank
from app.conversation.agent import Tool, ToolResult, UiEvent
from app.conversation.session import Session
from app.tools.catalogue_tools import ROUTINE_TURN

TUTORIALS_TURN = "tutorials_turn"  # the turn tutorials first showed: the hair bridge opens then
# Called right after get_routine, before the visitor answered about the routine, the tutorials
# skipped the cleanser and opened the hair bridge a turn early (3 of 7 replays, 2026-10-06).
NOT_YET = {
    "count": 0,
    "note": "The visitor has not answered about the routine yet. Do not mention tutorials: "
    "suggest the routine products and ask whether they would like them.",
}
NOTHING_TO_SHOW = {
    "count": 0,
    "note": "There are no tutorials for these products. Do not mention tutorials; go on.",
}


class ShowTutorialsArgs(BaseModel):
    product_ids: list[str] = Field(
        description="Ids of the products in the visitor's basket. An empty list uses the basket."
    )


def tutorials_tool(catalogue: Catalogue, bank: TutorialBank | None = None) -> Tool:
    """`bank` defaults to app/catalogue/data/tutorials.json, loaded here so that a bad file
    stops the backend at startup rather than in the middle of a conversation."""
    tutorials = bank if bank is not None else TutorialBank.load()

    async def handle(session: Session, args: ShowTutorialsArgs) -> ToolResult:
        proposed = session.flags.get(ROUTINE_TURN) == session.turn_index
        if proposed and len(session.basket.items) < 2:
            return ToolResult(content=json.dumps(NOT_YET))
        known = [pid for pid in args.product_ids if catalogue.get(pid) is not None]
        product_ids = known or [item.product_id for item in session.basket.items]
        chosen = tutorials.select(product_ids, session.language)
        if not chosen:
            return ToolResult(content=json.dumps(NOTHING_TO_SHOW))

        views = [tutorial.view() for tutorial in chosen]
        shown: list[dict[str, Any]] = session.flags.setdefault("shown_tutorials", [])
        already = {view["id"] for view in shown}
        shown.extend(view for view in views if view["id"] not in already)
        session.flags.setdefault(TUTORIALS_TURN, session.turn_index)
        return ToolResult(
            content=json.dumps(_summary(chosen), ensure_ascii=False),
            ui_events=[UiEvent(type="tutorials.shown", payload={"tutorials": views})],
        )

    return Tool(
        name="show_tutorials",
        description=(
            "Show tutorial videos from the brands and from creators on how to use the products "
            "in the visitor's basket. Call it only when the context section asks for it."
        ),
        args_model=ShowTutorialsArgs,
        handler=handle,
    )


def _summary(chosen: list[Tutorial]) -> dict[str, Any]:
    """What the model needs for its one sentence: how many, from whom, on which platforms."""
    creators = {t.creator: {"name": t.creator, "kind": t.creator_kind} for t in chosen}
    return {
        "count": len(chosen),
        "creators": list(creators.values()),
        "platforms": list(dict.fromkeys(t.platform for t in chosen)),
    }
