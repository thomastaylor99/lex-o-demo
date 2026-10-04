"""Add chosen products to the visitor's basket (spec 002)."""

import json

from pydantic import BaseModel, Field

from app.catalogue.store import Catalogue
from app.conversation.agent import Tool, ToolResult, UiEvent
from app.conversation.session import Session


class BasketArgs(BaseModel):
    product_ids: list[str] = Field(
        description="Ids of the products to add to the visitor's basket."
    )


def basket_tool(catalogue: Catalogue) -> Tool:
    async def handle_add_to_basket(session: Session, args: BasketArgs) -> ToolResult:
        added: list[str] = []
        already_in_basket: list[str] = []
        unknown: list[str] = []
        for product_id in args.product_ids:
            product = catalogue.get(product_id)
            if product is None:
                unknown.append(product_id)
            elif session.basket.add(product, session.language):
                added.append(product_id)
            else:
                already_in_basket.append(product_id)

        content = json.dumps(
            {
                "added": added,
                "already_in_basket": already_in_basket,
                "unknown": unknown,
                "basket": session.basket.view(),
            },
            ensure_ascii=False,
        )
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
