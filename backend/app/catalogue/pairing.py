"""The product that completes the visitor's routine (spec 002, Routine): plain code, like ranking.

Thomas, 2026-10-06: the routine is the cream and one cleanser. A cream gets the cleanser that suits
the visitor's skin; any other first skin product gets a cream. Three of the six creams link no
cleanser in the catalogue (`pairs_with`), so a link only counts as a preference. Order: suits the
visitor's skin type, then the search points, then linked to the product chosen, then made for the
same skin types as it, then the search order.
"""

from collections.abc import Iterable

from app.catalogue.models import Category, Product
from app.catalogue.ranking import SearchQuery, score, search
from app.lang import Language
from app.profile.models import BeautyProfile

SKINCARE = frozenset({Category.MOISTURISER, Category.CLEANSER, Category.SERUM, Category.SUNSCREEN})


def routine_partner(
    products: Iterable[Product],
    chosen: Product,
    profile: BeautyProfile,
    lang: Language,
    have: set[Category],
) -> Product | None:
    """The one product that completes the routine around `chosen`, or None when the categories
    already in the basket (`have`) complete it."""
    wanted = Category.CLEANSER if chosen.category == Category.MOISTURISER else Category.MOISTURISER
    if wanted in have:
        return None
    pool = list(products)
    query = SearchQuery(
        category=wanted,
        skin_type=profile.skin_type,
        concerns=profile.concerns,
        sensitive=profile.sensitive,
        texture_preference=profile.texture_preference if wanted == Category.MOISTURISER else None,
        fragrance_free=profile.fragrance_free,
        age_range=profile.age_range,
    )
    ranked = search(pool, query, lang, limit=len(pool)).products
    if not ranked:  # the visitor's filters leave nothing: any product of the category
        ranked = search(pool, SearchQuery(category=wanted), lang, limit=len(pool)).products
    if not ranked:
        return None

    def order(product: Product) -> tuple[bool, int, bool, int]:
        fits = profile.skin_type is None or profile.skin_type in product.skin_types
        shared = len(set(product.skin_types) & set(chosen.skin_types))
        return (not fits, -score(product, query), product.id not in chosen.pairs_with, -shared)

    return min(ranked, key=order)  # min keeps the search order among equals
