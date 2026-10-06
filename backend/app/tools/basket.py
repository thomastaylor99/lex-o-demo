"""Add chosen products to the visitor's basket (spec 002).

A product goes in only from the turn after it first showed: the visitor has heard of it and
answered. In the golden runs of 2026-10-06 the expert added the routine it had just suggested,
in the same reply that asked whether the visitor wanted it. The first skin product to go in is
the one the routine grows around (`app/agents/routine.py`). The basket also gives the record a
budget and a routine size where the visitor stated none (`app/profile/inferred.py`).
"""

import json
from typing import Any

from pydantic import BaseModel, Field

from app.catalogue.pairing import SKINCARE
from app.catalogue.store import Catalogue
from app.conversation.agent import Tool, ToolResult, UiEvent
from app.conversation.session import Session
from app.profile.inferred import from_basket
from app.tools.catalogue_tools import FIRST_SHOWN, SKIN_CHOICE

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
                if product.category in SKINCARE:
                    session.flags.setdefault(
                        SKIN_CHOICE, {"id": product_id, "turn": session.turn_index}
                    )
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
        events = [UiEvent(type="basket.updated", payload=session.basket.view())]
        if added:
            events.append(_read_basket(session, catalogue))
        return ToolResult(content=json.dumps(body, ensure_ascii=False), ui_events=events)

    return Tool(
        name="add_to_basket",
        description="Add one or more chosen products, by id, to the visitor's basket.",
        args_model=BasketArgs,
        handler=handle_add_to_basket,
    )


def _read_basket(session: Session, catalogue: Catalogue) -> UiEvent:
    """The budget and routine size the basket now shows, on the record."""
    products = [catalogue.get(item.product_id) for item in session.basket.items]
    skin = sum(1 for product in products if product is not None and product.category in SKINCARE)
    prices = [item.price_eur for item in session.basket.items]
    session.profile = from_basket(session.profile, prices, skin)
    return UiEvent(
        type="profile.updated",
        payload={"profile": session.profile.model_dump(mode="json")},
        latest=lambda: {"profile": session.profile.model_dump(mode="json")},
    )
