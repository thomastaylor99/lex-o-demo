"""Shape of a product as it goes to the model and the browser (spec 002)."""

from typing import Any

from app.catalogue.models import Product
from app.lang import Language


def product_view(product: Product, lang: Language, fit: str | None = None) -> dict[str, Any]:
    """The same view feeds the model's tool results and the `products.shown` UI event. No scores.
    `fit` is the one-sentence reason this product suits the visitor (spec 006), built from facts."""
    return {
        "id": product.id,
        "brand": product.brand,
        "division": product.division,
        "name": product.name.get(lang),
        "category": product.category,
        "routine_step": product.routine_step,
        "texture": product.texture,
        "spf": product.spf,
        "fragrance_free": product.fragrance_free,
        "size_ml": product.size_ml,
        "price_eur": float(product.price_eur),
        "url": str(product.url.get(lang)),
        "claims": [{"id": claim.id, "text": claim.text} for claim in product.claims_in(lang)],
        "usage_notes": [{"id": note.id, "text": note.text} for note in product.notes_in(lang)],
        "fit": fit,
    }
