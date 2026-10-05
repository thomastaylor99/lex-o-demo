"""Tests for deterministic product ranking (spec 002)."""

from decimal import Decimal
from pathlib import Path

from app.catalogue.models import Category, Concern, SkinType, TexturePreference
from app.catalogue.ranking import SearchQuery, search
from app.catalogue.store import Catalogue
from app.profile.models import AgeRange

FIXTURE_PATH = Path(__file__).resolve().parent.parent / "fixtures" / "catalogue_fixture.json"


def _load_fixture() -> Catalogue:
    return Catalogue.load(FIXTURE_PATH)


def test_dry_sensitive_rich_budget_30_puts_rich_fragrance_free_first():
    catalogue = _load_fixture()
    query = SearchQuery(
        category=Category.MOISTURISER,
        skin_type=SkinType.DRY,
        sensitive=True,
        texture_preference=TexturePreference.RICH,
        max_price_eur=Decimal("30"),
    )

    outcome = search(catalogue.all(), query, "en")

    assert outcome.products[0].id == "fx-rich-dry"


def test_oily_light_budget_15_gives_the_gel_cream():
    catalogue = _load_fixture()
    query = SearchQuery(
        category=Category.MOISTURISER,
        skin_type=SkinType.OILY,
        texture_preference=TexturePreference.LIGHT,
        max_price_eur=Decimal("15"),
    )

    outcome = search(catalogue.all(), query, "en")

    assert [p.id for p in outcome.products] == ["fx-gel-oily"]
    assert outcome.relaxed == []


def test_fragrance_free_drops_products_whose_flag_is_not_true():
    catalogue = _load_fixture()
    query = SearchQuery(category=Category.MOISTURISER, fragrance_free=True)

    outcome = search(catalogue.all(), query, "en")

    assert {p.id for p in outcome.products} == {"fx-rich-dry"}
    assert all(p.fragrance_free is True for p in outcome.products)


def test_budget_of_5_relaxes_price_and_reports_relaxed():
    catalogue = _load_fixture()
    query = SearchQuery(category=Category.MOISTURISER, max_price_eur=Decimal("5"))

    outcome = search(catalogue.all(), query, "en")

    assert outcome.relaxed == ["max_price_eur"]
    assert len(outcome.products) > 0


def test_lang_fr_never_returns_the_luxe_fixture():
    catalogue = _load_fixture()
    query = SearchQuery(category=Category.MOISTURISER)

    outcome = search(catalogue.all(), query, "fr", limit=10)

    assert "fx-luxe-firm" not in {p.id for p in outcome.products}


def test_results_never_exceed_limit():
    catalogue = _load_fixture()
    query = SearchQuery(category=Category.MOISTURISER)

    outcome = search(catalogue.all(), query, "en", limit=2)

    assert len(outcome.products) <= 2


def test_from_forty_the_age_range_puts_firmness_care_first():
    catalogue = _load_fixture()
    query = SearchQuery(category=Category.MOISTURISER, skin_type=SkinType.NORMAL)

    without_age = search(catalogue.all(), query, "en")
    in_forties = query.model_copy(update={"age_range": AgeRange.FORTIES})
    forties = search(catalogue.all(), in_forties, "en")

    assert without_age.products[0].id == "fx-light-dry"
    assert forties.products[0].id == "fx-luxe-firm"


def test_a_concern_the_visitor_names_outranks_the_age_range():
    catalogue = _load_fixture()
    query = SearchQuery(
        category=Category.MOISTURISER,
        skin_type=SkinType.DRY,
        concerns=[Concern.HYDRATION],
        age_range=AgeRange.FIFTIES,
    )

    outcome = search(catalogue.all(), query, "en")

    assert outcome.products[0].id != "fx-luxe-firm"
