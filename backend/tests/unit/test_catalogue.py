"""Tests for the catalogue schema, basket and store (spec 002)."""

import json
from datetime import date
from decimal import Decimal
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.catalogue.basket import Basket
from app.catalogue.models import (
    Category,
    Claim,
    Division,
    Localized,
    LocalizedUrl,
    Product,
    RoutineStep,
    Texture,
)
from app.catalogue.store import DATA_PATH, Catalogue

FIXTURE_PATH = Path(__file__).resolve().parent.parent / "fixtures" / "catalogue_fixture.json"


def _claim(product_id: str, kind: str, lang: str) -> Claim:
    return Claim(
        id=f"{product_id}-{kind}-{lang}",
        lang=lang,
        text=f"Fixture {kind}: obviously fake text for {product_id}.",
        source_url="https://example.com/claims",
        copied_on=date(2026, 10, 4),
    )


def _make_product(product_id: str, **overrides: object) -> Product:
    fields: dict[str, object] = {
        "id": product_id,
        "brand": "Fixture Brand A",
        "division": Division.CONSUMER_PRODUCTS,
        "name": Localized(en="Test product", fr="Produit test"),
        "url": LocalizedUrl(en="https://example.com/en", fr="https://example.com/fr"),
        "category": Category.MOISTURISER,
        "routine_step": RoutineStep.MOISTURISE,
        "texture": Texture.LIGHT_CREAM,
        "size_ml": 50,
        "price_eur": Decimal("10.00"),
        "price_source_url": "https://example.com/price",
        "approved_claims": [_claim(product_id, "claim", "en")],
        "usage_notes": [_claim(product_id, "note", "en")],
    }
    fields.update(overrides)
    return Product.model_validate(fields)


def _load_fixture() -> Catalogue:
    return Catalogue.load(FIXTURE_PATH)


def _product_dict(product_id: str, **overrides: object) -> dict:
    return _make_product(product_id, **overrides).model_dump(mode="json")


def _write_catalogue(tmp_path: Path, payload: object) -> Path:
    path = tmp_path / "catalogue.json"
    path.write_text(json.dumps(payload))
    return path


def test_fixture_loads_into_a_catalogue_of_six():
    catalogue = _load_fixture()

    assert len(catalogue.all()) == 6


def test_duplicate_product_id_raises():
    product = _make_product("fx-dup")

    with pytest.raises(ValueError, match="fx-dup"):
        Catalogue([product, product])


def test_problems_reports_a_dangling_pairs_with():
    product = _make_product("fx-dangling", pairs_with=["fx-does-not-exist"])
    catalogue = Catalogue([product])

    problems = catalogue.problems()

    assert any("fx-does-not-exist" in problem for problem in problems)


def test_has_language_fr_false_for_luxe_true_for_rich_dry():
    catalogue = _load_fixture()

    assert catalogue.get("fx-luxe-firm").has_language("fr") is False
    assert catalogue.get("fx-rich-dry").has_language("fr") is True


def test_basket_add_adds_once_and_then_returns_false():
    catalogue = _load_fixture()
    product = catalogue.get("fx-rich-dry")
    basket = Basket()

    assert basket.add(product, "en") is True
    assert basket.add(product, "en") is False
    assert len(basket.items) == 1


def test_basket_total_eur_sums_two_items_exactly():
    catalogue = _load_fixture()
    basket = Basket()
    basket.add(catalogue.get("fx-rich-dry"), "en")
    basket.add(catalogue.get("fx-light-dry"), "en")

    assert basket.total_eur == Decimal("24.90") + Decimal("32.00")


def test_basket_divisions_and_view():
    catalogue = _load_fixture()
    basket = Basket()
    basket.add(catalogue.get("fx-rich-dry"), "en")
    basket.add(catalogue.get("fx-gel-oily"), "en")

    assert basket.divisions() == {
        Division.DERMATOLOGICAL_BEAUTY,
        Division.CONSUMER_PRODUCTS,
    }

    view = basket.view()

    assert [item["product_id"] for item in view["items"]] == ["fx-rich-dry", "fx-gel-oily"]
    assert view["total_eur"] == pytest.approx(37.40)
    assert isinstance(view["total_eur"], float)
    assert all(isinstance(item["price_eur"], float) for item in view["items"])
    assert [item["price_eur"] for item in view["items"]] == [
        pytest.approx(24.90),
        pytest.approx(12.50),
    ]


def test_product_rejects_an_unexpected_top_level_field():
    fields = _product_dict("fx-typo-top")
    fields["frangrance_free"] = True  # misspelt key

    with pytest.raises(ValidationError):
        Product.model_validate(fields)


def test_localized_name_rejects_an_unexpected_field():
    fields = _product_dict("fx-typo-name")
    fields["name"]["typo_field"] = "oops"

    with pytest.raises(ValidationError):
        Product.model_validate(fields)


def test_claim_rejects_an_unexpected_field():
    fields = _product_dict("fx-typo-claim")
    fields["approved_claims"][0]["typo_field"] = "oops"

    with pytest.raises(ValidationError):
        Product.model_validate(fields)


def test_localized_url_get_returns_a_plain_str():
    url = LocalizedUrl(en="https://example.com/en", fr="https://example.com/fr")

    assert url.get("en") == "https://example.com/en"
    assert isinstance(url.get("fr"), str)


def test_price_eur_is_decimal_in_python_and_float_in_json():
    product = _make_product("fx-price-check", price_eur=Decimal("19.99"))

    assert product.price_eur == Decimal("19.99")
    dumped = product.model_dump(mode="json")
    assert dumped["price_eur"] == 19.99
    assert isinstance(dumped["price_eur"], float)


def test_price_eur_rejects_more_than_two_decimal_places():
    with pytest.raises(ValidationError):
        _make_product("fx-price-bad", price_eur=Decimal("19.999"))


def test_load_raises_on_wrong_top_level_shape(tmp_path):
    path = _write_catalogue(tmp_path, [_product_dict("fx-wrong-shape")])

    with pytest.raises(ValueError, match="products"):
        Catalogue.load(path)


def test_load_raises_on_empty_products_list(tmp_path):
    path = _write_catalogue(tmp_path, {"products": []})

    with pytest.raises(ValueError, match="empty"):
        Catalogue.load(path)


def test_load_raises_on_a_dangling_pairs_with(tmp_path):
    payload = {"products": [_product_dict("fx-load-dangling", pairs_with=["fx-missing"])]}
    path = _write_catalogue(tmp_path, payload)

    with pytest.raises(ValueError, match="fx-missing"):
        Catalogue.load(path)


def test_load_raises_on_a_duplicate_claim_id(tmp_path):
    shared_claim = _claim("fx-shared", "claim", "en").model_dump(mode="json")
    first = _product_dict("fx-load-dup-a")
    second = _product_dict("fx-load-dup-b")
    first["approved_claims"] = [shared_claim]
    second["approved_claims"] = [shared_claim]

    path = _write_catalogue(tmp_path, {"products": [first, second]})

    with pytest.raises(ValueError, match="fx-shared-claim-en"):
        Catalogue.load(path)


def test_load_raises_naming_the_file_and_the_failing_product_id(tmp_path):
    bad = _product_dict("fx-load-bad-product")
    bad["spf"] = "not-a-number"
    path = _write_catalogue(tmp_path, {"products": [bad]})

    with pytest.raises(ValueError, match="fx-load-bad-product"):
        Catalogue.load(path)


@pytest.mark.skipif(not DATA_PATH.exists(), reason="products.json arrives in T20")
def test_real_catalogue():
    catalogue = Catalogue.load(DATA_PATH)
    products = catalogue.all()

    assert len(products) >= 10
    assert catalogue.problems() == []

    moisturisers = [p for p in products if p.category == Category.MOISTURISER]
    assert len({p.division for p in moisturisers}) >= 2
    assert sum(1 for p in moisturisers if p.spf) >= 1
    assert sum(1 for p in products if p.fragrance_free is True) >= 2

    prices = [p.price_eur for p in products]
    assert min(prices) < 15


@pytest.mark.skipif(not DATA_PATH.exists(), reason="products.json arrives in T20")
def test_real_catalogue_has_both_languages():
    catalogue = Catalogue.load(DATA_PATH)
    products = catalogue.all()

    for product in products:
        assert product.has_language("en")
        assert product.has_language("fr")
