"""Tests for the tutorial bank and the show_tutorials tool (spec 006)."""

import json
from pathlib import Path

import pytest

from app.catalogue import store
from app.catalogue.store import Catalogue
from app.catalogue.tutorials import DATA_PATH, Tutorial, TutorialBank
from app.conversation.session import Session
from app.tools.tutorials import tutorials_tool

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"
CATALOGUE = Catalogue.load(FIXTURES / "catalogue_fixture.json")
BANK = TutorialBank.load(FIXTURES / "tutorials.json")
EVENT_FIELDS = {
    "id",
    "product_ids",
    "brand",
    "platform",
    "creator",
    "creator_kind",
    "title",
    "url",
    "language",
}


def _ids(tutorials: list[Tutorial]) -> list[str]:
    return [tutorial.id for tutorial in tutorials]


def test_select_takes_products_in_turn_in_the_given_order_each_tutorial_once():
    assert _ids(BANK.select(["fx-rich-dry", "fx-cleanser"], "en")) == [
        "fx-rich-brand-tiktok-en",
        "fx-cleanser-brand-tiktok-en",
        "fx-rich-creator-youtube-en",
        "fx-routine-creator-instagram-en",  # shared by both products, shown once
    ]
    assert _ids(BANK.select(["fx-cleanser", "fx-rich-dry"], "en")) == [
        "fx-cleanser-brand-tiktok-en",
        "fx-rich-brand-tiktok-en",
        "fx-routine-creator-instagram-en",
        "fx-rich-creator-youtube-en",
    ]
    rich_only = _ids(BANK.select(["fx-rich-dry", "fx-rich-dry"], "en", limit=10))
    assert rich_only[-1] == "fx-rich-brand-youtube-fr"  # the other language comes last
    assert len(rich_only) == len(set(rich_only)) == 4


def test_select_puts_the_session_language_first_and_keeps_a_creator_beside_the_brands():
    # In French the two best are both brand videos; the second gives way to the best creator.
    assert _ids(BANK.select(["fx-rich-dry"], "fr", limit=2)) == [
        "fx-rich-brand-youtube-fr",
        "fx-rich-creator-youtube-en",
    ]
    assert _ids(BANK.select(["fx-rich-dry"], "fr", limit=1)) == ["fx-rich-brand-youtube-fr"]
    # The creator that replaces the cleanser's brand video also covers the cleanser.
    assert _ids(BANK.select(["fx-rich-dry", "fx-cleanser"], "en", limit=2)) == [
        "fx-rich-brand-tiktok-en",
        "fx-routine-creator-instagram-en",
    ]
    assert BANK.select(["fx-gel-oily", "does-not-exist"], "en") == []


def test_load_rejects_a_duplicate_tutorial_id(tmp_path):
    raw = json.loads((FIXTURES / "tutorials.json").read_text(encoding="utf-8"))
    path = tmp_path / "tutorials.json"
    path.write_text(json.dumps({"tutorials": raw["tutorials"] * 2}), encoding="utf-8")

    with pytest.raises(ValueError, match="duplicate tutorial ids"):
        TutorialBank.load(path)


def test_shipped_tutorials_load_and_point_to_catalogue_products():
    catalogue = Catalogue.load(store.DATA_PATH)
    tutorials = TutorialBank.load(DATA_PATH).all()

    unknown = {pid for t in tutorials for pid in t.product_ids if catalogue.get(pid) is None}
    assert unknown == set()


async def test_show_tutorials_emits_the_event_and_keeps_what_it_showed_for_the_recap():
    tool = tutorials_tool(CATALOGUE, BANK)
    session = Session(id="s1", active_agent="skincare", language="en")
    args = tool.args_model(product_ids=["fx-rich-dry", "fx-cleanser"])

    result = await tool.handler(session, args)
    await tool.handler(session, args)  # shown twice, kept once

    [event] = result.ui_events
    views = event.payload["tutorials"]
    assert event.type == "tutorials.shown"
    assert [view["id"] for view in views] == _ids(BANK.select(["fx-rich-dry", "fx-cleanser"], "en"))
    assert all(set(view) == EVENT_FIELDS for view in views)
    assert session.flags["shown_tutorials"] == views
    assert json.loads(result.content) == {
        "count": 4,
        "creators": [
            {"name": "@fixturebranda", "kind": "brand"},
            {"name": "Fixture Creator", "kind": "creator"},
            {"name": "@fixturecreator", "kind": "creator"},
        ],
        "platforms": ["tiktok", "youtube", "instagram"],
    }


@pytest.mark.parametrize("product_ids", [[], ["does-not-exist"]])
async def test_show_tutorials_falls_back_to_the_basket(product_ids):
    tool = tutorials_tool(CATALOGUE, BANK)
    session = Session(id="s1", active_agent="skincare", language="fr")
    session.basket.add(CATALOGUE.get("fx-hair-dry"), "fr")

    result = await tool.handler(session, tool.args_model(product_ids=product_ids))

    assert [view["id"] for view in result.ui_events[0].payload["tutorials"]] == [
        "fx-hair-creator-tiktok-fr"
    ]


async def test_show_tutorials_with_nothing_to_show_tells_the_model_and_emits_nothing():
    tool = tutorials_tool(CATALOGUE, BANK)
    session = Session(id="s1", active_agent="skincare", language="en")

    result = await tool.handler(session, tool.args_model(product_ids=["fx-gel-oily"]))

    body = json.loads(result.content)
    assert body["count"] == 0
    assert "Do not mention tutorials" in body["note"]
    assert result.ui_events == []
    assert "shown_tutorials" not in session.flags


def _chose_the_cream(turn: int, **flags: object) -> Session:
    """A session where the visitor put the cream in the basket at `turn`."""
    session = Session(id="s1", active_agent="skincare", turn_index=turn)
    session.flags.update({"skin_choice": {"id": "fx-rich-dry", "turn": turn}, **flags})
    session.basket.add(CATALOGUE.get("fx-rich-dry"), "en")
    return session


async def test_show_tutorials_waits_for_the_routine_to_be_suggested():
    """Thomas's run of 2026-10-06: before any routine was suggested, the tutorials showed for the
    cream alone."""
    tool = tutorials_tool(CATALOGUE, BANK)
    session = _chose_the_cream(4)
    session.turn_index = 5

    early = await tool.handler(session, tool.args_model(product_ids=["fx-rich-dry"]))

    assert (json.loads(early.content)["count"], early.ui_events) == (0, [])
    assert "tutorials_turn" not in session.flags


async def test_show_tutorials_after_the_visitor_declined_the_routine_shows_the_cream_alone():
    tool = tutorials_tool(CATALOGUE, BANK)
    cleanser = {"id": "fx-cleanser", "name": "Fixture Cleanser"}
    session = _chose_the_cream(4, routine_turn=4, routine_pick=cleanser)
    session.turn_index = 5  # the visitor said no thanks

    shown = await tool.handler(session, tool.args_model(product_ids=["fx-rich-dry"]))

    assert shown.ui_events and session.flags["tutorials_turn"] == 5


async def test_show_tutorials_with_nothing_to_show_still_closes_the_routine():
    tool = tutorials_tool(CATALOGUE, BANK)
    session = Session(id="s1", active_agent="skincare", language="en", turn_index=6)

    await tool.handler(session, tool.args_model(product_ids=["fx-gel-oily"]))

    assert session.flags["tutorials_turn"] == 6  # the hair bridge opens all the same


async def test_show_tutorials_waits_for_the_answer_about_the_routine_just_proposed():
    tool = tutorials_tool(CATALOGUE, BANK)
    cleanser = {"id": "fx-cleanser", "name": "Fixture Cleanser"}
    session = _chose_the_cream(5, routine_turn=5, routine_pick=cleanser)
    args = tool.args_model(product_ids=["fx-rich-dry", "fx-cleanser"])

    early = await tool.handler(session, args)
    assert (json.loads(early.content)["count"], early.ui_events) == (0, [])
    assert "tutorials_turn" not in session.flags

    session.basket.add(CATALOGUE.get("fx-cleanser"), "en")  # the visitor took the cleanser
    shown = await tool.handler(session, args)
    assert shown.ui_events and session.flags["tutorials_turn"] == 5
