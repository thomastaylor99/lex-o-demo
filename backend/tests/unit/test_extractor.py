"""Tests for the profile extractor observer (spec 002, T12)."""

from collections.abc import Awaitable, Callable

import pytest

from app.catalogue.models import Concern, SkinType, TexturePreference
from app.conversation.session import Session
from app.lang import Language
from app.profile.extractor import (
    FeedbackExtraction,
    Parsed,
    ProfileExtraction,
    make_profile_observer,
    to_update,
)
from app.profile.models import (
    AgeRange,
    BudgetBand,
    HairType,
    ProductFeedback,
    RoutineSize,
    Verdict,
)

MODEL = "mistral-small-latest"

Parse = Callable[[str, list[dict[str, str]]], Awaitable[Parsed]]


def _session(language: Language = "en") -> Session:
    return Session(id="session-1", active_agent="skincare", language=language)


def _empty_extraction(**overrides: object) -> ProfileExtraction:
    fields: dict[str, object] = {
        "first_name": None,
        "skin_type": None,
        "concerns": [],
        "sensitive": None,
        "texture_preference": None,
        "budget_max_eur": None,
        "routine_size": None,
        "fragrance_free": None,
        "hair_type": None,
        "hair_concerns": [],
        "age_years": None,
        "product_feedback": [],
    }
    fields.update(overrides)
    return ProfileExtraction(**fields)


def _parse_returning(result: ProfileExtraction | None) -> Parse:
    async def parse(model: str, messages: list[dict[str, str]]) -> Parsed:
        return Parsed(extraction=result)

    return parse


async def test_observer_merges_extraction_into_profile_and_emits_one_event():
    extraction = ProfileExtraction(
        first_name="Alex",
        skin_type=SkinType.DRY,
        concerns=[Concern.HYDRATION],
        sensitive=True,
        texture_preference=TexturePreference.RICH,
        budget_max_eur=25.0,
        routine_size=RoutineSize.STANDARD,
        fragrance_free=True,
        hair_type=HairType.CURLY,
        hair_concerns=[Concern.FRIZZ],
        age_years=38,
        product_feedback=[
            FeedbackExtraction(
                brand="L'Oréal Paris", product="a day cream", verdict="disliked", reason="too light"
            )
        ],
    )
    session = _session()
    observer = make_profile_observer(_parse_returning(extraction), MODEL)

    events = await observer(session, "visitor text", "adviser text")

    assert session.profile.first_name == "Alex"
    assert session.profile.skin_type == SkinType.DRY
    assert session.profile.concerns == [Concern.HYDRATION]
    assert session.profile.sensitive is True
    assert session.profile.texture_preference == TexturePreference.RICH
    assert session.profile.budget_band == BudgetBand.FROM_20_TO_40
    assert session.profile.routine_size == RoutineSize.STANDARD
    assert session.profile.fragrance_free is True
    assert session.profile.hair_type == HairType.CURLY
    assert session.profile.hair_concerns == [Concern.FRIZZ]
    assert session.profile.age_range == AgeRange.THIRTIES
    assert session.profile.product_feedback == [
        ProductFeedback(
            brand="L'Oréal Paris",
            product="a day cream",
            verdict=Verdict.DISLIKED,
            reason="too light",
        )
    ]
    expected = {"profile": session.profile.model_dump(mode="json")}
    assert [(e.type, e.payload) for e in events] == [("profile.updated", expected)]
    assert events[0].latest is not None and events[0].latest() == expected


@pytest.mark.parametrize(
    ("budget_max_eur", "expected_band"),
    [
        (20, BudgetBand.UNDER_20),
        (15, BudgetBand.UNDER_20),
        (30, BudgetBand.FROM_20_TO_40),
        (40, BudgetBand.FROM_20_TO_40),
        (80, BudgetBand.FROM_40_TO_80),
        (81, BudgetBand.OVER_80),
    ],
)
def test_to_update_bands_budget_max_eur(budget_max_eur, expected_band):
    update = to_update(_empty_extraction(budget_max_eur=budget_max_eur))

    assert update.budget_band == expected_band


def test_to_update_leaves_budget_band_null_when_not_stated():
    update = to_update(_empty_extraction())

    assert update.budget_band is None


async def test_observer_returns_empty_list_and_leaves_profile_on_exception():
    async def raising_parse(model: str, messages: list[dict[str, str]]) -> Parsed:
        raise RuntimeError("boom")

    session = _session()
    before = session.profile.model_copy(deep=True)
    observer = make_profile_observer(raising_parse, MODEL)

    events = await observer(session, "visitor text", "adviser text")

    assert events == []
    assert session.profile == before


async def test_observer_returns_empty_list_on_none_result():
    session = _session()
    observer = make_profile_observer(_parse_returning(None), MODEL)

    events = await observer(session, "visitor text", "adviser text")

    assert events == []


async def test_observer_profile_language_follows_session():
    session = _session(language="fr")
    observer = make_profile_observer(_parse_returning(_empty_extraction()), MODEL)

    await observer(session, "bonjour", None)

    assert session.profile.language == "fr"


async def test_observer_sends_visitor_text_and_none_placeholder_for_missing_reply():
    captured: dict[str, object] = {}

    async def capturing_parse(model: str, messages: list[dict[str, str]]) -> Parsed:
        captured["model"] = model
        captured["messages"] = messages
        return Parsed(extraction=_empty_extraction())

    session = _session()
    observer = make_profile_observer(capturing_parse, MODEL)

    await observer(session, "I have dry skin", None)

    assert captured["model"] == MODEL
    messages = captured["messages"]
    assert messages[0]["role"] == "system"
    assert messages[-1] == {
        "role": "user",
        "content": "Adviser: (none)\nVisitor: I have dry skin",
    }


async def test_observer_sends_previous_reply_when_present():
    captured: dict[str, object] = {}

    async def capturing_parse(model: str, messages: list[dict[str, str]]) -> Parsed:
        captured["messages"] = messages
        return Parsed(extraction=_empty_extraction())

    session = _session()
    observer = make_profile_observer(capturing_parse, MODEL)

    await observer(session, "It's dry and flaky", "Does your skin feel tight or shiny?")

    assert captured["messages"][-1] == {
        "role": "user",
        "content": "Adviser: Does your skin feel tight or shiny?\nVisitor: It's dry and flaky",
    }


def test_profile_extraction_schema_requires_every_field():
    schema = ProfileExtraction.model_json_schema()

    assert set(schema["required"]) == {
        "first_name",
        "skin_type",
        "concerns",
        "sensitive",
        "texture_preference",
        "budget_max_eur",
        "routine_size",
        "fragrance_free",
        "hair_type",
        "hair_concerns",
        "age_years",
        "product_feedback",
    }
    feedback = schema["$defs"]["FeedbackExtraction"]
    assert set(feedback["required"]) == {"brand", "product", "verdict", "reason"}


@pytest.mark.parametrize(
    ("age_years", "expected"),
    [
        (None, None),
        (0, None),
        (24, AgeRange.UNDER_30),
        (30, AgeRange.THIRTIES),
        (38, AgeRange.THIRTIES),
        (45, AgeRange.FORTIES),
        (59, AgeRange.FIFTIES),
        (60, AgeRange.SIXTY_PLUS),
    ],
)
def test_to_update_bands_the_age_in_decades(age_years, expected):
    assert to_update(_empty_extraction(age_years=age_years)).age_range == expected
