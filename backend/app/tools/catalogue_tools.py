"""Search the catalogue and build the routine around a chosen product (spec 002)."""

import json
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field

from app.catalogue.fit import fit_sentence, search_profile
from app.catalogue.models import Category, Concern, Product, SkinType, TexturePreference
from app.catalogue.pairing import SKINCARE, routine_partner
from app.catalogue.ranking import SearchQuery, search
from app.catalogue.store import Catalogue
from app.conversation.agent import Tool, ToolResult, UiEvent
from app.conversation.session import Session
from app.lang import Language
from app.profile.inferred import stated
from app.profile.models import AgeRange, BeautyProfile
from app.tools.views import product_view

LAST_SEARCH_TURN = "last_search_turn"
SEARCH_TURNS = "search_turns"  # the first turn each category was searched
ROUTINE_TURN = "routine_turn"  # the last turn get_routine ran
ROUTINE_PICK = "routine_pick"  # the product view get_routine last suggested; None: nothing to add
FIRST_SHOWN = "first_shown"  # product id: the turn it first showed, which add_to_basket reads
SKIN_CHOICE = (
    "skin_choice"  # set by add_to_basket: the first skin product in the basket, {id, turn}
)
ROUTINE_COMPLETE = {
    "note": "The basket already completes the routine: suggest nothing more for it."
}


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
    product_id: str = Field(description="Id of the product the visitor chose, to build on.")


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
        profile = search_profile(stated(session.profile), query)
        views = _views(outcome.products, profile, session.language)

        session.flags[LAST_SEARCH_TURN] = session.turn_index
        session.flags["last_results"] = views  # the expert's reply must present views[0] first
        session.flags.setdefault(SEARCH_TURNS, {}).setdefault(args.category, session.turn_index)
        _record_shown(session, outcome.products)

        best_match_id = outcome.products[0].id if outcome.products else None
        # The screen marks the first result "Top pick": the model gets it by that name.
        content = json.dumps(
            {
                "top_pick": views[0] if views else None,
                "alternatives": views[1:],
                "relaxed": outcome.relaxed,
            },
            ensure_ascii=False,
        )
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
        """The one product that completes the routine (Thomas, 2026-10-06: the cream and one
        cleanser), suited to the visitor's skin (`app/catalogue/pairing.py`)."""
        chosen = _routine_anchor(catalogue, session, args.product_id)
        if chosen is None:
            return ToolResult(content=json.dumps({"error": "unknown product"}, ensure_ascii=False))

        have = {
            p.category for item in session.basket.items if (p := catalogue.get(item.product_id))
        }
        profile = stated(session.profile)
        partner = routine_partner(catalogue.all(), chosen, profile, session.language, have)
        paired = [partner] if partner is not None else []
        views = _views(paired, profile, session.language)
        session.flags[ROUTINE_TURN] = session.turn_index
        session.flags[ROUTINE_PICK] = views[0] if views else None
        _record_shown(session, paired)

        body: dict[str, Any] = {
            "for": chosen.id,
            "usage_notes": [
                {"id": note.id, "text": note.text} for note in chosen.notes_in(session.language)
            ],
            "routine": [
                {"step": product.routine_step, "product": view}
                for product, view in zip(paired, views, strict=True)
            ],
        }
        if not views:
            body |= ROUTINE_COMPLETE
        events = [
            UiEvent(type="products.shown", payload={"products": views, "best_match_id": None})
        ]
        return ToolResult(
            content=json.dumps(body, ensure_ascii=False), ui_events=events if views else []
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
        description="Get the one product that completes the routine around a chosen product.",
        args_model=RoutineArgs,
        handler=handle_get_routine,
    )
    return search_tool, routine_tool


def _routine_anchor(catalogue: Catalogue, session: Session, product_id: str) -> Product | None:
    """The skin product the routine grows around: the visitor's first skin choice in the basket,
    else the product named, if it is a skin product."""
    choice = session.flags.get(SKIN_CHOICE)
    first = catalogue.get(choice["id"]) if choice else None
    named = catalogue.get(product_id)
    if first is not None:
        return first
    return named if named is not None and named.category in SKINCARE else None


def _record_shown(session: Session, products: list[Product]) -> None:
    """The products now on screen, in order, and the turn each first showed."""
    shown_ids = session.flags.setdefault("shown_ids", [])
    first_shown = session.flags.setdefault(FIRST_SHOWN, {})
    for product in products:
        if product.id not in shown_ids:
            shown_ids.append(product.id)
        first_shown.setdefault(product.id, session.turn_index)


def _views(products: list[Product], profile: BeautyProfile, lang: Language) -> list[dict[str, Any]]:
    """Product views with the one-sentence reason each suits this visitor (spec 006)."""
    return [product_view(p, lang, fit=fit_sentence(p, profile, lang)) for p in products]
