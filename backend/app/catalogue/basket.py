"""The visitor's basket (spec 002)."""

from decimal import Decimal
from typing import Any

from pydantic import BaseModel

from app.catalogue.models import Division, PriceEur, Product
from app.lang import Language


class BasketItem(BaseModel):
    product_id: str
    brand: str
    name: str
    division: Division
    price_eur: PriceEur


class Basket(BaseModel):
    items: list[BasketItem] = []

    def add(self, product: Product, lang: Language) -> bool:
        """Add a product once. Returns False when it is already in the basket."""
        if any(item.product_id == product.id for item in self.items):
            return False
        self.items.append(
            BasketItem(
                product_id=product.id,
                brand=product.brand,
                name=product.name.get(lang),
                division=product.division,
                price_eur=product.price_eur,
            )
        )
        return True

    @property
    def total_eur(self) -> Decimal:
        return sum((item.price_eur for item in self.items), Decimal("0"))

    def divisions(self) -> set[Division]:
        return {item.division for item in self.items}

    def view(self) -> dict[str, Any]:
        return {
            "items": [item.model_dump(mode="json") for item in self.items],
            "total_eur": float(self.total_eur),
        }
