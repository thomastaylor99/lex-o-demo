"""Search the catalogue and build the routine around a chosen product (spec 002)."""

import json
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field

from app.catalogue.fit import fit_sentence, search_profile
from app.catalogue.models import Category, Concern, Product, SkinType, TexturePreference
from app.catalogue.ranking import SearchQuery, search
from app.catalogue.store import Catalogue
from app.conversation.agent import Tool, ToolResult, UiEvent
from app.conversation.session import Session
from app.lang import Language
from app.profile.models import AgeRange, BeautyProfile
from app.tools.views import product_view


class SearchArgs(BaseModel):
    """Mirrors `SearchQuery`, with the budget expressed as a plain float for the model."""

    category: Category = Field(description="Product category to search, for example moisturiser.")
    skin_type: SkinType | None = Field(
        default=None, description="The visitor's skin type, when known."
    )
    concerns: list[Concern] = Field(
        default=[], description="Skin or hair concerns the visitor has mentioned."
    )
    sensitive: bool | None = Field(
        default=None,
        description=(
            "True when the visitor's skin is sensitive or reacts easily; drops products not "
            "suitable for sensitive skin."
        ),
    )
    texture_preference: TexturePreference | None = Field(
        default=None, description="Whether the visitor prefers a rich or a light texture."
    )
    max_price_eur: float | None = Field(
        default=None, description="The visitor's maximum budget in euros, when they gave one."
    )
    fragrance_free: bool | None = Field(
        default=None, description="True when the visitor wants a fragrance-free product only."
    )
    spf_needed: bool | None = Field(
        default=None, description="True when the visitor needs sun protection."
    )
    age_range: AgeRange | None = Field(
        default=None, description="The visitor's age range, when they gave one."
    )


class RoutineArgs(BaseModel):
    product_id: str = Field(
        description="Id of the product to build the surrounding routine around."
    )


def catalogue_tools(catalogue: Catalogue) -> tuple[Tool, Tool]:
    async def handle_search(session: Session, args: SearchArgs) -> ToolResult:
        query = SearchQuery(
            category=args.category,
            skin_type=args.skin_type,
            concerns=args.concerns,
            sensitive=args.sensitive,
            texture_preference=args.texture_preference,
            max_price_eur=None if args.max_price_eur is None else Decimal(str(args.max_price_eur)),
            fragrance_free=args.fragrance_free,
            spf_needed=args.spf_needed,
            age_range=args.age_range,
        )
        outcome = search(catalogue.all(), query, session.language)
        views = _views(outcome.products, search_profile(session.profile, query), session.language)

        session.flags["last_search_turn"] = session.turn_index
        shown_ids = session.flags.setdefault("shown_ids", [])
        for product in outcome.products:
            if product.id not in shown_ids:
                shown_ids.append(product.id)

        best_match_id = outcome.products[0].id if outcome.products else None
        content = json.dumps({"results": views, "relaxed": outcome.relaxed}, ensure_ascii=False)
        return ToolResult(
            content=content,
            ui_events=[
                UiEvent(
                    type="products.shown",
                    payload={"products": views, "best_match_id": best_match_id},
                )
            ],
        )

    async def handle_get_routine(session: Session, args: RoutineArgs) -> ToolResult:
        product = catalogue.get(args.product_id)
        if product is None:
            return ToolResult(content=json.dumps({"error": "unknown product"}, ensure_ascii=False))

        paired = [
            partner
            for partner_id in product.pairs_with
            if (partner := catalogue.get(partner_id)) is not None
            and partner.has_language(session.language)
        ]
        views = _views(paired, session.profile, session.language)

        shown_ids = session.flags.setdefault("shown_ids", [])
        for partner in paired:
            if partner.id not in shown_ids:
                shown_ids.append(partner.id)

        content = json.dumps(
            {
                "for": product.id,
                "usage_notes": [
                    {"id": note.id, "text": note.text}
                    for note in product.notes_in(session.language)
                ],
                "routine": [
                    {"step": partner.routine_step, "product": view}
                    for partner, view in zip(paired, views, strict=True)
                ],
            },
            ensure_ascii=False,
        )
        return ToolResult(
            content=content,
            ui_events=[
                UiEvent(type="products.shown", payload={"products": views, "best_match_id": None})
            ],
        )

    search_tool = Tool(
        name="search_products",
        description=(
            "Search the product catalogue for up to three matches in one category, ranked by fit "
            "to the visitor's skin, concerns, texture preference and budget."
        ),
        args_model=SearchArgs,
        handler=handle_search,
    )
    routine_tool = Tool(
        name="get_routine",
        description="Get the products that pair with a chosen product to complete a routine.",
        args_model=RoutineArgs,
        handler=handle_get_routine,
    )
    return search_tool, routine_tool


def _views(products: list[Product], profile: BeautyProfile, lang: Language) -> list[dict[str, Any]]:
    """Product views with the one-sentence reason each suits this visitor (spec 006)."""
    return [product_view(p, lang, fit=fit_sentence(p, profile, lang)) for p in products]
