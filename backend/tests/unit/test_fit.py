"""Tests for the one-sentence reason a product suits the visitor (spec 006)."""

import json
from itertools import product as combinations
from pathlib import Path

import pytest

from app.catalogue.fit import fit_sentence, search_profile
from app.catalogue.models import Concern, Product, RoutineStep, SkinType, TexturePreference
from app.catalogue.ranking import SearchQuery
from app.catalogue.store import DATA_PATH, Catalogue
from app.conversation.session import Session
from app.profile.models import BeautyProfile, BudgetBand
from app.tools import build_tools

FIXTURE_PATH = Path(__file__).resolve().parent.parent / "fixtures" / "catalogue_fixture.json"
CATALOGUE = Catalogue.load(FIXTURE_PATH)
NBSP = "\u00a0"
PROFILE_VALUES: dict[str, list[object]] = {
    "skin_type": [None, *SkinType],
    "sensitive": [None, True],
    "texture_preference": [None, *TexturePreference],
    "fragrance_free": [None, True],
    "budget_band": [None, *BudgetBand],
    "hair_concerns": [[], [Concern.DRY_HAIR]],
}


def _product(product_id: str, **changes: object) -> Product:
    product = CATALOGUE.get(product_id)
    assert product is not None
    return product.model_copy(update=changes)


def test_a_full_match_leads_with_the_skin_then_three_facts():
    rich = _product("fx-rich-dry")
    profile = BeautyProfile(
        skin_type="dry",
        sensitive=True,
        texture_preference="rich",
        fragrance_free=True,
        budget_band="20_to_40",
    )

    assert fit_sentence(rich, profile, "en") == (
        "For dry, sensitive skin: the rich texture you like, fragrance-free, within your budget."
    )
    assert fit_sentence(rich, profile, "fr") == (
        f"Pour peau sèche et sensible{NBSP}: la texture riche que vous aimez, sans parfum, "
        "dans votre budget."
    )


@pytest.mark.parametrize(
    ("profile", "language", "expected"),
    [
        (BeautyProfile(skin_type="dry"), "en", "For dry skin."),
        (BeautyProfile(skin_type="dry"), "fr", "Pour peau sèche."),
        (BeautyProfile(sensitive=True), "en", "For sensitive skin."),
        (BeautyProfile(texture_preference="rich"), "en", "The rich texture you like."),
        (BeautyProfile(budget_band="20_to_40"), "en", "Within your budget."),
        (BeautyProfile(budget_band="40_to_80"), "en", "Within your budget."),  # cheaper than band
        (BeautyProfile(budget_band="under_20"), "en", None),  # over the budget
        (BeautyProfile(), "en", None),
        (BeautyProfile(skin_type="oily", sensitive=False, texture_preference="light"), "en", None),
    ],
)
def test_partial_profiles_give_only_the_facts_that_match(profile, language, expected):
    assert fit_sentence(_product("fx-rich-dry"), profile, language) == expected


def test_a_protect_step_names_its_spf_first_and_only_beside_a_match():
    sunscreen = _product("fx-light-dry", routine_step=RoutineStep.PROTECT)
    profile = BeautyProfile(skin_type="dry", texture_preference="light", budget_band="20_to_40")

    assert fit_sentence(sunscreen, profile, "en") == (
        "For dry skin: SPF 30 for daytime, the light texture you like, within your budget."
    )
    assert fit_sentence(sunscreen, profile, "fr") == (
        f"Pour peau sèche{NBSP}: SPF 30 pour la journée, la texture légère que vous aimez, "
        "dans votre budget."
    )
    assert fit_sentence(_product("fx-light-dry"), profile, "en") == (
        "For dry skin: the light texture you like, within your budget."
    )
    assert fit_sentence(sunscreen, BeautyProfile(), "en") is None


def test_a_hair_product_leads_with_the_hair_concern():
    hair = _product("fx-hair-dry")
    profile = BeautyProfile(skin_type="dry", hair_concerns=["dry_hair"], budget_band="under_20")

    assert fit_sentence(hair, profile, "en") == "For dry hair: within your budget."
    assert fit_sentence(hair, profile, "fr") == f"Pour cheveux secs{NBSP}: dans votre budget."


def test_every_sentence_over_the_real_catalogue_is_short_and_well_formed():
    products = Catalogue.load(DATA_PATH).all()
    for values in combinations(*PROFILE_VALUES.values()):
        profile = BeautyProfile.model_validate(dict(zip(PROFILE_VALUES, values, strict=True)))
        for product, language in combinations(products, ("en", "fr")):
            sentence = fit_sentence(product, profile, language)
            if sentence is not None:
                assert len(sentence) <= 100, sentence
                assert sentence[0].isupper() and sentence.endswith("."), sentence
                assert "None" not in sentence and "{}" not in sentence, sentence


def test_search_profile_lays_the_search_criteria_over_the_profile():
    profile = BeautyProfile(skin_type="dry", sensitive=True, hair_concerns=["frizz"])
    query = SearchQuery(category="haircare", concerns=["dry_hair", "hydration"], max_price_eur=25)

    merged = search_profile(profile, query)

    assert (merged.skin_type, merged.sensitive, merged.budget_band) == ("dry", True, "20_to_40")
    assert merged.hair_concerns == ["frizz", "dry_hair"]
    assert profile.budget_band is None  # the session's profile is left alone


async def test_search_and_routine_results_carry_the_fit():
    tools = build_tools(CATALOGUE)
    session = Session(id="s1", active_agent="skincare", language="en")
    search_args = tools["search_products"].args_model(
        category="moisturiser",
        skin_type="dry",
        sensitive=True,
        texture_preference="rich",
        max_price_eur=30.0,
    )

    result = await tools["search_products"].handler(session, search_args)

    best = json.loads(result.content)["top_pick"]
    assert best["id"] == "fx-rich-dry"
    assert best["fit"] == "For dry, sensitive skin: the rich texture you like, within your budget."

    session.profile.skin_type = SkinType.DRY
    routine_args = tools["get_routine"].args_model(product_id="fx-rich-dry")
    routine = json.loads((await tools["get_routine"].handler(session, routine_args)).content)
    assert routine["routine"][0]["product"]["fit"] == "For dry skin."
