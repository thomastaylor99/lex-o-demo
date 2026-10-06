"""Tests for the agent tools: transfer, catalogue search, basket, profile (spec 002)."""

import json
from pathlib import Path

import pytest

from app.catalogue.models import SkinType
from app.catalogue.store import Catalogue
from app.conversation.session import Session
from app.profile.models import Consent
from app.tools import build_tools
from app.tools.views import product_view

FIXTURE_PATH = Path(__file__).resolve().parent.parent / "fixtures" / "catalogue_fixture.json"


def _catalogue() -> Catalogue:
    return Catalogue.load(FIXTURE_PATH)


def _session(**overrides: object) -> Session:
    fields: dict[str, object] = {"id": "s1", "active_agent": "skincare", "language": "en"}
    fields.update(overrides)
    return Session(**fields)


# --------------------------------------------------------------------- views


def test_product_view_has_the_documented_fields_and_no_scores():
    catalogue = _catalogue()
    product = catalogue.get("fx-rich-dry")

    view = product_view(product, "en")

    assert view == {
        "id": "fx-rich-dry",
        "brand": "Fixture Brand A",
        "division": "dermatological_beauty",
        "name": "Fixture Rich Cream",
        "category": "moisturiser",
        "routine_step": "moisturise",
        "texture": "rich_cream",
        "spf": None,
        "fragrance_free": True,
        "size_ml": 50,
        "price_eur": 24.90,
        "url": "https://example.com/fx-rich-dry/en",
        "claims": [
            {
                "id": "fx-rich-dry-claim-en",
                "text": "Fixture claim: hydrates fixture skin for 24 hours.",
            }
        ],
        "usage_notes": [
            {
                "id": "fx-rich-dry-note-en",
                "text": "Fixture note: apply morning and evening on fixture skin.",
            }
        ],
        "fit": None,
    }
    # the view feeds json.dumps directly: no non-JSON-native types (HttpUrl, enums as objects, ...)
    json.dumps(view, ensure_ascii=False)


def test_product_view_follows_lang():
    catalogue = _catalogue()
    product = catalogue.get("fx-rich-dry")

    view = product_view(product, "fr")

    assert view["name"] == "Crème Riche Fixture"
    assert view["claims"][0]["id"] == "fx-rich-dry-claim-fr"


# ---------------------------------------------------------------- build_tools


def test_build_tools_returns_the_six_tools_keyed_by_name():
    tools = build_tools(_catalogue())

    assert set(tools) == {
        "transfer_to_agent",
        "search_products",
        "get_routine",
        "add_to_basket",
        "save_profile",
        "show_tutorials",
    }


def test_every_tool_arg_field_declares_a_description():
    tools = build_tools(_catalogue())

    for tool in tools.values():
        schema = tool.args_model.model_json_schema()
        for field_name, prop in schema["properties"].items():
            assert prop.get("description"), f"{tool.name}.{field_name} has no description"


# ------------------------------------------------------------- transfer_to_agent


async def test_transfer_unclear_first_time_sets_flag_and_ends_turn_for_clarification():
    tool = build_tools(_catalogue())["transfer_to_agent"]
    session = _session()
    args = tool.args_model(agent="unclear", summary="Visitor wants something but is vague.")

    result = await tool.handler(session, args)

    assert json.loads(result.content) == {"status": "clarify"}
    assert result.line == "clarify"
    assert result.end_turn is True
    assert result.switch_to is None
    assert session.flags["clarified"] is True


async def test_transfer_unclear_second_time_switches_to_skincare():
    tool = build_tools(_catalogue())["transfer_to_agent"]
    session = _session()
    first = tool.args_model(agent="unclear", summary="Still vague.")
    await tool.handler(session, first)

    second = tool.args_model(agent="unclear", summary="Now I understand: dry skin.")
    result = await tool.handler(session, second)

    assert json.loads(result.content) == {"status": "transferred", "to": "skincare"}
    assert result.switch_to == "skincare"
    assert result.line == "handover_skincare"
    assert session.flags["handover_summary"] == "Now I understand: dry skin."


async def test_transfer_skincare_switches_immediately_on_a_fresh_session():
    tool = build_tools(_catalogue())["transfer_to_agent"]
    session = _session()
    args = tool.args_model(agent="skincare", summary="Wants a dry-skin moisturiser.")

    result = await tool.handler(session, args)

    assert result.switch_to == "skincare"
    assert result.line == "handover_skincare"
    assert session.flags["handover_summary"] == "Wants a dry-skin moisturiser."
    assert "clarified" not in session.flags


# ------------------------------------------------------------- search_products


async def test_search_products_dry_sensitive_rich_budget_30_returns_rich_cream_first():
    tool = build_tools(_catalogue())["search_products"]
    session = _session()
    args = tool.args_model(
        category="moisturiser",
        skin_type="dry",
        sensitive=True,
        texture_preference="rich",
        max_price_eur=30.0,
    )

    result = await tool.handler(session, args)
    body = json.loads(result.content)

    assert body["results"][0]["id"] == "fx-rich-dry"
    assert body["relaxed"] == []
    assert len(result.ui_events) == 1
    event = result.ui_events[0]
    assert event.type == "products.shown"
    assert event.payload["best_match_id"] == "fx-rich-dry"
    assert event.payload["products"] == body["results"]
    assert session.flags["last_search_turn"] == session.turn_index
    assert "fx-rich-dry" in session.flags["shown_ids"]


async def test_search_products_relaxes_price_and_reports_it():
    tool = build_tools(_catalogue())["search_products"]
    session = _session()
    args = tool.args_model(category="moisturiser", max_price_eur=5.0)

    result = await tool.handler(session, args)
    body = json.loads(result.content)

    assert body["relaxed"] == ["max_price_eur"]
    assert len(body["results"]) > 0


async def test_search_products_accumulates_shown_ids_without_duplicates():
    tool = build_tools(_catalogue())["search_products"]
    session = _session()
    args = tool.args_model(category="moisturiser")

    await tool.handler(session, args)
    await tool.handler(session, args)

    shown = session.flags["shown_ids"]
    assert len(shown) == len(set(shown))


async def test_search_products_with_no_results_has_no_best_match():
    tool = build_tools(_catalogue())["search_products"]
    session = _session()
    # the fixture has no eye_care product at all, so the pool is empty regardless of filters.
    args = tool.args_model(category="eye_care")

    result = await tool.handler(session, args)
    body = json.loads(result.content)

    assert body["results"] == []
    assert result.ui_events[0].payload["best_match_id"] is None


# ----------------------------------------------------------------- get_routine


async def test_get_routine_returns_paired_products_and_usage_notes():
    tool = build_tools(_catalogue())["get_routine"]
    session = _session()
    args = tool.args_model(product_id="fx-rich-dry")

    result = await tool.handler(session, args)
    body = json.loads(result.content)

    assert body["for"] == "fx-rich-dry"
    assert body["usage_notes"] == [
        {
            "id": "fx-rich-dry-note-en",
            "text": "Fixture note: apply morning and evening on fixture skin.",
        }
    ]
    assert len(body["routine"]) == 1
    assert body["routine"][0]["step"] == "cleanse"
    assert body["routine"][0]["product"]["id"] == "fx-cleanser"

    assert len(result.ui_events) == 1
    event = result.ui_events[0]
    assert event.type == "products.shown"
    assert event.payload["best_match_id"] is None
    assert [p["id"] for p in event.payload["products"]] == ["fx-cleanser"]
    assert "fx-cleanser" in session.flags["shown_ids"]


async def test_get_routine_unknown_product_returns_error_and_no_ui_event():
    tool = build_tools(_catalogue())["get_routine"]
    session = _session()
    args = tool.args_model(product_id="does-not-exist")

    result = await tool.handler(session, args)

    assert json.loads(result.content) == {"error": "unknown product"}
    assert result.ui_events == []


# --------------------------------------------------------------- add_to_basket


async def test_add_to_basket_reports_added_already_in_basket_and_unknown():
    tool = build_tools(_catalogue())["add_to_basket"]
    session = _session()
    args = tool.args_model(product_ids=["fx-rich-dry", "does-not-exist", "fx-rich-dry"])

    result = await tool.handler(session, args)
    body = json.loads(result.content)

    assert body["added"] == ["fx-rich-dry"]
    assert body["already_in_basket"] == ["fx-rich-dry"]
    assert body["unknown"] == ["does-not-exist"]
    assert body["basket"] == session.basket.view()
    assert [item["product_id"] for item in body["basket"]["items"]] == ["fx-rich-dry"]

    assert len(result.ui_events) == 1
    event = result.ui_events[0]
    assert event.type == "basket.updated"
    assert event.payload == session.basket.view()


async def test_add_to_basket_unknown_id_alone_breaks_nothing():
    tool = build_tools(_catalogue())["add_to_basket"]
    session = _session()
    args = tool.args_model(product_ids=["does-not-exist"])

    result = await tool.handler(session, args)
    body = json.loads(result.content)

    assert body["added"] == []
    assert body["unknown"] == ["does-not-exist"]
    assert body["basket"]["items"] == []


async def test_a_product_goes_in_the_basket_from_the_turn_after_it_first_showed():
    tools = build_tools(_catalogue())
    session = _session(turn_index=5)
    await tools["get_routine"].handler(
        session, tools["get_routine"].args_model(product_id="fx-rich-dry")
    )
    args = tools["add_to_basket"].args_model(product_ids=["fx-cleanser"])

    early = json.loads((await tools["add_to_basket"].handler(session, args)).content)
    assert (early["added"], early["not_yet"]) == ([], ["fx-cleanser"])
    assert session.basket.items == []

    session.turn_index = 6  # the visitor said yes
    later = json.loads((await tools["add_to_basket"].handler(session, args)).content)
    assert (later["added"], "not_yet" in later) == (["fx-cleanser"], False)


# ----------------------------------------------------------------- save_profile


async def test_save_profile_consent_given_sets_consent_and_first_name():
    tool = build_tools(_catalogue())["save_profile"]
    session = _session()
    session.profile.skin_type = SkinType.DRY
    args = tool.args_model(consent=True, first_name="Alex")

    result = await tool.handler(session, args)
    body = json.loads(result.content)

    assert body["saved"] is True
    assert body["profile"]["consent"] == "given"
    assert body["profile"]["first_name"] == "Alex"
    assert body["profile"]["skin_type"] == "dry"
    assert body["basket_total_eur"] == pytest.approx(float(session.basket.total_eur))
    assert session.profile.consent == Consent.GIVEN
    assert session.profile.first_name == "Alex"

    assert len(result.ui_events) == 1
    event = result.ui_events[0]
    assert event.type == "profile.updated"
    assert event.payload == {"profile": session.profile.model_dump(mode="json")}


async def test_save_profile_refusal_wipes_skin_type_and_declines_consent():
    tool = build_tools(_catalogue())["save_profile"]
    session = _session()
    session.profile.skin_type = SkinType.DRY
    args = tool.args_model(consent=False)

    result = await tool.handler(session, args)
    body = json.loads(result.content)

    assert body["saved"] is False
    assert body["profile"]["skin_type"] is None
    assert body["profile"]["consent"] == "declined"
    assert body["profile"]["language"] == "en"
    assert session.profile.skin_type is None
    assert session.profile.consent == Consent.DECLINED
