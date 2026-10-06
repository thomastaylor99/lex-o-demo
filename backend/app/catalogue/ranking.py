"""Deterministic product search (spec 002): filters, then points, then budget distance."""

from collections.abc import Iterable
from decimal import Decimal

from pydantic import BaseModel

from app.catalogue.models import Category, Concern, Product, SkinType, Texture, TexturePreference
from app.lang import Language
from app.profile.models import AgeRange

TEXTURES: dict[TexturePreference, set[Texture]] = {
    TexturePreference.RICH: {Texture.RICH_CREAM, Texture.BALM},
    TexturePreference.LIGHT: {
        Texture.LIGHT_CREAM,
        Texture.GEL_CREAM,
        Texture.FLUID,
        Texture.LOTION,
    },
}


# From 30, the age range tips the ranking towards ageing care, by half what a concern the visitor
# names counts (Thomas, 2026-10-05).
AGE_CONCERNS: dict[AgeRange, Concern] = {
    AgeRange.THIRTIES: Concern.FIRST_SIGNS_OF_AGEING,
    AgeRange.FORTIES: Concern.FIRMNESS_WRINKLES,
    AgeRange.FIFTIES: Concern.FIRMNESS_WRINKLES,
    AgeRange.SIXTY_PLUS: Concern.FIRMNESS_WRINKLES,
}


# The visitor's skin says nothing about their hair: a haircare search drops these, so a sensitive
# skin carried over from the skin search does not empty it (spec 002, Cross-sell).
SKIN_CRITERIA: dict[str, None] = dict.fromkeys(
    ("skin_type", "sensitive", "texture_preference", "spf_needed", "age_range")
)


class SearchQuery(BaseModel):
    category: Category
    skin_type: SkinType | None = None
    concerns: list[Concern] = []
    sensitive: bool | None = None
    texture_preference: TexturePreference | None = None
    max_price_eur: Decimal | None = None
    fragrance_free: bool | None = None
    spf_needed: bool | None = None
    age_range: AgeRange | None = None


class SearchOutcome(BaseModel):
    products: list[Product]
    relaxed: list[str] = []


def search(
    products: Iterable[Product], query: SearchQuery, lang: Language, limit: int = 3
) -> SearchOutcome:
    if query.category == Category.HAIRCARE:
        query = query.model_copy(update=SKIN_CRITERIA)
    pool = [p for p in products if p.category == query.category and p.has_language(lang)]
    hits = [p for p in pool if _passes(p, query, use_price=True)]
    relaxed: list[str] = []
    if not hits and query.max_price_eur is not None:
        hits = [p for p in pool if _passes(p, query, use_price=False)]
        relaxed = ["max_price_eur"]
    budget = query.max_price_eur
    hits.sort(
        key=lambda p: (
            -score(p, query),
            abs(p.price_eur - budget) if budget is not None else Decimal(0),
            p.id,
        )
    )
    return SearchOutcome(products=hits[:limit], relaxed=relaxed)


def _passes(p: Product, q: SearchQuery, *, use_price: bool) -> bool:
    if q.sensitive and not p.suitable_for_sensitive:
        return False
    if q.fragrance_free and p.fragrance_free is not True:
        return False
    if q.spf_needed and not p.spf:
        return False
    return not (use_price and q.max_price_eur is not None and p.price_eur > q.max_price_eur)


def score(p: Product, q: SearchQuery) -> int:
    """Points for fit to the visitor: skin type 3, each concern named 2, texture 1, age range 1."""
    points = 3 if q.skin_type is not None and q.skin_type in p.skin_types else 0
    points += 2 * sum(1 for c in q.concerns if c in p.concerns)
    if q.texture_preference is not None and p.texture in TEXTURES[q.texture_preference]:
        points += 1
    if q.age_range in AGE_CONCERNS and AGE_CONCERNS[q.age_range] in p.concerns:
        points += 1
    return points
