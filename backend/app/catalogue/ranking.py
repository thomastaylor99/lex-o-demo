"""Deterministic product search (spec 002): filters, then points, then budget distance."""

from collections.abc import Iterable
from decimal import Decimal

from pydantic import BaseModel

from app.catalogue.models import Category, Concern, Product, SkinType, Texture, TexturePreference
from app.lang import Language

TEXTURES: dict[TexturePreference, set[Texture]] = {
    TexturePreference.RICH: {Texture.RICH_CREAM, Texture.BALM},
    TexturePreference.LIGHT: {
        Texture.LIGHT_CREAM,
        Texture.GEL_CREAM,
        Texture.FLUID,
        Texture.LOTION,
    },
}


class SearchQuery(BaseModel):
    category: Category
    skin_type: SkinType | None = None
    concerns: list[Concern] = []
    sensitive: bool | None = None
    texture_preference: TexturePreference | None = None
    max_price_eur: Decimal | None = None
    fragrance_free: bool | None = None
    spf_needed: bool | None = None


class SearchOutcome(BaseModel):
    products: list[Product]
    relaxed: list[str] = []


def search(
    products: Iterable[Product], query: SearchQuery, lang: Language, limit: int = 3
) -> SearchOutcome:
    pool = [p for p in products if p.category == query.category and p.has_language(lang)]
    hits = [p for p in pool if _passes(p, query, use_price=True)]
    relaxed: list[str] = []
    if not hits and query.max_price_eur is not None:
        hits = [p for p in pool if _passes(p, query, use_price=False)]
        relaxed = ["max_price_eur"]
    budget = query.max_price_eur
    hits.sort(
        key=lambda p: (
            -_score(p, query),
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


def _score(p: Product, q: SearchQuery) -> int:
    score = 3 if q.skin_type is not None and q.skin_type in p.skin_types else 0
    score += 2 * sum(1 for c in q.concerns if c in p.concerns)
    if q.texture_preference is not None and p.texture in TEXTURES[q.texture_preference]:
        score += 1
    return score
