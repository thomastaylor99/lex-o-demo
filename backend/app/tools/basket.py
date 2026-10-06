"""Add chosen products to the visitor's basket (spec 002).

A product goes in only from the turn after it first showed: the visitor has heard of it and
answered. In the golden runs of 2026-10-06 the expert added the routine it had just suggested,
in the same reply that asked whether the visitor wanted it.
"""

import json
from typing import Any

from pydantic import BaseModel, Field

from app.catalogue.store import Catalogue
from app.conversation.agent import Tool, ToolResult, UiEvent
from app.conversation.session import Session
from app.tools.catalogue_tools import FIRST_SHOWN

NOT_YET_NOTE = (
    "The products in not_yet only just showed, and the visitor has not answered yet: do not say "
    "they are in the basket; ask whether they would like them."
)


class BasketArgs(BaseModel):
    product_ids: list[str] = Field(
        description="Ids of the products to add to the visitor's basket."
    )


def basket_tool(catalogue: Catalogue) -> Tool:
    async def handle_add_to_basket(session: Session, args: BasketArgs) -> ToolResult:
        added: list[str] = []
        already_in_basket: list[str] = []
        unknown: list[str] = []
        not_yet: list[str] = []
        first_shown = session.flags.get(FIRST_SHOWN, {})
        for product_id in args.product_ids:
            product = catalogue.get(product_id)
            if product is None:
                unknown.append(product_id)
            elif first_shown.get(product_id) == session.turn_index:
                not_yet.append(product_id)
            elif session.basket.add(product, session.language):
                added.append(product_id)
            else:
                already_in_basket.append(product_id)

        body: dict[str, Any] = {
            "added": added,
            "already_in_basket": already_in_basket,
            "unknown": unknown,
            "basket": session.basket.view(),
        }
        if not_yet:
            body |= {"not_yet": not_yet, "note": NOT_YET_NOTE}
        content = json.dumps(body, ensure_ascii=False)
        return ToolResult(
            content=content,
            ui_events=[UiEvent(type="basket.updated", payload=session.basket.view())],
        )

    return Tool(
        name="add_to_basket",
        description="Add one or more chosen products, by id, to the visitor's basket.",
        args_model=BasketArgs,
        handler=handle_add_to_basket,
    )
