"""The product catalogue: load from disk, look up by id, validate pairings and claims (spec 002)."""

import json
from collections.abc import Iterable
from pathlib import Path

from pydantic import TypeAdapter, ValidationError

from app.catalogue.models import Product

DATA_PATH = Path(__file__).parent / "data" / "products.json"

_PRODUCTS_ADAPTER: TypeAdapter[list[Product]] = TypeAdapter(list[Product])
_EXPECTED_SHAPE = "a top-level object shaped like {'products': [...]}"


class Catalogue:
    def __init__(self, products: Iterable[Product]) -> None:
        self._products: dict[str, Product] = {}
        for product in products:
            if product.id in self._products:
                raise ValueError(f"duplicate product id: {product.id}")
            self._products[product.id] = product

    @classmethod
    def load(cls, path: Path) -> Catalogue:
        text = path.read_text(encoding="utf-8")
        try:
            raw = json.loads(text)
        except json.JSONDecodeError as exc:
            raise ValueError(f"{path}: not valid JSON, expected {_EXPECTED_SHAPE}") from exc

        if not isinstance(raw, dict) or not isinstance(raw.get("products"), list):
            raise ValueError(f"{path}: expected {_EXPECTED_SHAPE}")

        products_raw = raw["products"]
        if not products_raw:
            raise ValueError(f"{path}: 'products' must not be empty")

        try:
            products = _PRODUCTS_ADAPTER.validate_python(products_raw)
        except ValidationError as exc:
            failing_id = _failing_product_id(products_raw, exc)
            raise ValueError(f"{path}: invalid product '{failing_id}': {exc}") from exc

        catalogue = cls(products)
        issues = catalogue.problems()
        if issues:
            raise ValueError(f"{path}: catalogue has problems: {'; '.join(issues)}")
        return catalogue

    def get(self, product_id: str) -> Product | None:
        return self._products.get(product_id)

    def all(self) -> list[Product]:
        return list(self._products.values())

    def problems(self) -> list[str]:
        """Dangling `pairs_with` ids and claim ids reused across products."""
        known_ids = set(self._products)
        problems = [
            f"{product.id}: pairs_with unknown product '{target}'"
            for product in self._products.values()
            for target in product.pairs_with
            if target not in known_ids
        ]

        claim_owners: dict[str, list[str]] = {}
        for product in self._products.values():
            for claim in (*product.approved_claims, *product.usage_notes):
                claim_owners.setdefault(claim.id, []).append(product.id)
        problems.extend(
            f"claim id '{claim_id}' used {len(owners)} times, in products: {', '.join(owners)}"
            for claim_id, owners in sorted(claim_owners.items())
            if len(owners) > 1
        )

        return problems


def _failing_product_id(products_raw: list[object], exc: ValidationError) -> str:
    """Best-effort id of the list item that failed validation, for a readable error."""
    errors = exc.errors()
    if not errors or not errors[0]["loc"]:
        return "unknown"
    index = errors[0]["loc"][0]
    if not isinstance(index, int) or not 0 <= index < len(products_raw):
        return "unknown"
    candidate = products_raw[index]
    if isinstance(candidate, dict) and isinstance(candidate.get("id"), str):
        return candidate["id"]
    return f"at index {index}"
