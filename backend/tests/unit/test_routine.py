"""The routine (spec 002, Routine): after the first skin choice, one product completes the routine,
is added if the visitor agrees, then the routine's tutorials show, the same way every time."""

import json
from decimal import Decimal
from pathlib import Path
from typing import Any

import pytest

from app.agents.routine import OFFER, Answer, answer
from app.agents.skincare import HAIR_NOTES, build_skincare
from app.catalogue.models import Category, SkinType, TexturePreference
from app.catalogue.pairing import routine_partner
from app.catalogue.store import DATA_PATH, Catalogue
from app.catalogue.tutorials import TutorialBank
from app.conversation.agent import ToolResult, force
from app.conversation.session import Session
from app.profile.inferred import from_basket
from app.profile.models import BeautyProfile
from app.tools import build_tools
from app.tools.tutorials import tutorials_tool

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"
CATALOGUE = Catalogue.load(FIXTURES / "catalogue_fixture.json")
TOOLS = build_tools(CATALOGUE) | {
    "show_tutorials": tutorials_tool(CATALOGUE, TutorialBank.load(FIXTURES / "tutorials.json"))
}
EXPERT = build_skincare("test-model", TOOLS)
SHIPPED = Catalogue.load(DATA_PATH)
CLAIM = "Fixture claim: cleanses fixture skin without stripping it."
CLEAN = (
    "Lovely, it's in your basket. To complete your routine, the Fixture Brand A Fixture Gel "
    f"Cleanser {CLAIM.lower()} Would you like to add it too?"
)


async def _call(session: Session, name: str, **args: Any) -> ToolResult:
    """One round of the loop: the expert calls a tool, and the call and its result join the
    history."""
    call_id = f"call{len(session.history)}"
    session.history.append(
        {
            "role": "assistant",
            "content": "",
            "tool_calls": [
                {
                    "id": call_id,
                    "type": "function",
                    "function": {"name": name, "arguments": json.dumps(args)},
                }
            ],
        }
    )
    tool = TOOLS[name]
    result = await tool.handler(session, tool.args_model(**args))
    session.history.append(
        {"role": "tool", "tool_call_id": call_id, "name": name, "content": result.content}
    )
    return result


def _visitor(session: Session, line: str) -> None:
    """The visitor's next line opens a new turn, as the loop does."""
    session.turn_index += 1
    session.history.append({"role": "user", "content": line})


async def _offered() -> Session:
    """A session where the visitor chose the cream at turn 4 and the cleanser was suggested."""
    session = Session(id="s1", active_agent="skincare", turn_index=3)
    await _call(session, "search_products", category="moisturiser", skin_type="dry")
    _visitor(session, "The first one, please.")
    await _call(session, "add_to_basket", product_ids=["fx-rich-dry"])
    await _call(session, "get_routine", product_id="fx-rich-dry")
    session.history.append({"role": "assistant", "content": CLEAN})
    return session


async def test_the_turn_the_cream_goes_in_fetches_then_suggests_the_cleanser():
    session = Session(id="s1", active_agent="skincare", turn_index=3)
    await _call(session, "search_products", category="moisturiser", skin_type="dry")
    _visitor(session, "The first one, please.")
    assert EXPERT.tool_choice(session) == "auto"  # the choice itself is the model's

    await _call(session, "add_to_basket", product_ids=["fx-rich-dry"])
    assert EXPERT.tool_choice(session) == force("get_routine")
    assert 'call get_routine now with product_id "fx-rich-dry"' in EXPERT.context_block(session)

    result = await _call(session, "get_routine", product_id="fx-rich-dry")
    [event] = result.ui_events
    assert [product["id"] for product in event.payload["products"]] == ["fx-cleanser"]
    assert EXPERT.tool_choice(session) == "none"
    block = EXPERT.context_block(session)
    assert f'word for word: "{CLAIM}"' in block
    assert "suggest Fixture Brand A Fixture Gel Cleanser" in block


@pytest.mark.parametrize(
    "reply",
    [
        "It's in your basket. Would you like a cleanser and a serum to go with it?",
        "It's in your basket. The Fixture Gel Cleanser completes your routine.",
        "The Fixture Gel Cleanser and a sunscreen complete it. Shall I add them?",
        "It's in your basket. Would you like the Fixture Light Cream as well?",
    ],
)
async def test_a_suggestion_that_strays_becomes_the_fixed_one(reply: str):
    session = await _offered()
    session.history.pop()

    assert EXPERT.vet_reply(session, reply) == OFFER["en"].format(
        name="Fixture Brand A Fixture Gel Cleanser", claim=f"{CLAIM} "
    )
    assert EXPERT.vet_reply(session, CLEAN) == CLEAN


async def test_yes_adds_the_cleanser_then_shows_the_tutorials_then_asks_about_hair():
    session = await _offered()
    _visitor(session, "Yeah, that would be great.")
    assert EXPERT.tool_choice(session) == force("add_to_basket")
    assert 'call add_to_basket with ["fx-cleanser"]' in EXPERT.context_block(session)

    await _call(session, "add_to_basket", product_ids=["fx-cleanser"])
    assert EXPERT.tool_choice(session) == force("show_tutorials")

    result = await _call(session, "show_tutorials", product_ids=["fx-rich-dry", "fx-cleanser"])
    assert result.ui_events, result.content
    assert EXPERT.tool_choice(session) == "none"
    block = EXPERT.context_block(session)
    assert "here is how to use their routine" in block
    assert HAIR_NOTES["ask"] in block


async def test_no_shows_the_tutorials_for_the_cream_alone():
    session = await _offered()
    _visitor(session, "No thanks, I'm good.")
    assert EXPERT.tool_choice(session) == force("show_tutorials")

    await _call(session, "show_tutorials", product_ids=["fx-rich-dry"])
    assert [item.product_id for item in session.basket.items] == ["fx-rich-dry"]
    assert EXPERT.tool_choice(session) == "none"


async def test_a_question_gets_an_answer_and_the_next_turn_moves_on():
    session = await _offered()
    _visitor(session, "Is it gentle enough for every day?")
    assert EXPERT.tool_choice(session) == "auto"
    assert "ask again whether they would like it" in EXPERT.context_block(session)

    session.history.append({"role": "assistant", "content": "Yes. Would you like to add it?"})
    _visitor(session, "Hmm, let me think about it.")
    assert EXPERT.tool_choice(session) == force("show_tutorials")


async def test_a_basket_that_already_completes_the_routine_goes_straight_to_the_tutorials():
    session = Session(id="s1", active_agent="skincare", turn_index=3)
    await _call(session, "search_products", category="moisturiser", skin_type="dry")
    await _call(session, "get_routine", product_id="fx-rich-dry")
    _visitor(session, "I'll take the cream and the cleanser.")
    await _call(session, "add_to_basket", product_ids=["fx-rich-dry", "fx-cleanser"])
    assert EXPERT.tool_choice(session) == force("get_routine")

    result = await _call(session, "get_routine", product_id="fx-rich-dry")
    assert (result.ui_events, "completes the routine" in result.content) == ([], True)
    assert EXPERT.tool_choice(session) == force("show_tutorials")


@pytest.mark.parametrize(
    ("line", "said"),
    [
        ("Yes.", Answer.YES),
        ("That would be great.", Answer.YES),
        ("Yeah, that would be great.", Answer.YES),
        ("Yes please, add the cleanser.", Answer.YES),
        ("That's good, add it.", Answer.YES),
        ("Oui, avec plaisir.", Answer.YES),
        ("No thanks.", Answer.NO),
        ("I'm good, thanks.", Answer.NO),
        ("Non merci, ça ira.", Answer.NO),
        ("What does it do?", Answer.OTHER),
        ("Yes, but is it gentle?", Answer.OTHER),
        ("Hmm, let me think about it.", Answer.OTHER),
    ],
)
def test_the_answer_to_the_suggestion(line: str, said: Answer):
    assert answer(line) == said


@pytest.mark.parametrize(
    ("cream", "skin", "cleanser"),
    [
        # Thomas's two runs of 2026-10-06 ended on the AM lotion, which links no cleanser.
        ("cerave-spf30-moisturiser", SkinType.NORMAL, "cerave-hydrating-cleanser"),
        ("cerave-spf30-moisturiser", None, "cerave-hydrating-cleanser"),
        ("cerave-spf30-moisturiser", SkinType.OILY, "cerave-foaming-cleanser"),
        ("cerave-moisturising-cream", SkinType.DRY, "cerave-hydrating-cleanser"),
        ("cerave-oil-control-gel-cream", SkinType.OILY, "cerave-foaming-cleanser"),
        ("cerave-oil-control-gel-cream", SkinType.COMBINATION, "cerave-foaming-cleanser"),
        ("lrp-toleriane-sensitive-riche", SkinType.DRY, "cerave-hydrating-cleanser"),
        ("lop-revitalift-ff-day-cream", SkinType.DRY, "cerave-hydrating-cleanser"),
        ("lop-revitalift-ff-day-cream", SkinType.OILY, "cerave-foaming-cleanser"),
        ("lop-revitalift-filler-gel-cream", SkinType.DRY, "cerave-hydrating-cleanser"),
        ("lop-revitalift-filler-gel-cream", SkinType.OILY, "cerave-foaming-cleanser"),
    ],
)
@pytest.mark.parametrize("language", ["en", "fr"])
def test_every_cream_gets_the_cleanser_that_suits_the_skin(
    cream: str, skin: SkinType | None, cleanser: str, language: str
):
    profile = BeautyProfile(skin_type=skin)
    chosen = SHIPPED.get(cream)

    partner = routine_partner(SHIPPED.all(), chosen, profile, language, {Category.MOISTURISER})

    assert partner is not None and partner.id == cleanser


def test_a_cleanser_chosen_first_gets_the_cream_for_the_visitor():
    profile = BeautyProfile(skin_type=SkinType.DRY, texture_preference=TexturePreference.LIGHT)
    cleanser = SHIPPED.get("cerave-hydrating-cleanser")

    partner = routine_partner(SHIPPED.all(), cleanser, profile, "en", {Category.CLEANSER})

    assert partner is not None and partner.id == "cerave-spf30-moisturiser"


def test_a_routine_with_its_cleanser_needs_nothing_more():
    cream = SHIPPED.get("cerave-spf30-moisturiser")
    have = {Category.MOISTURISER, Category.CLEANSER}

    assert routine_partner(SHIPPED.all(), cream, BeautyProfile(), "en", have) is None


async def test_a_made_up_code_for_the_tutorials_becomes_the_fixed_sentence():
    """Told "a code to scan", the expert made up a number for it in 7 of 10 replays."""
    session = await _offered()
    _visitor(session, "Yes please.")
    await _call(session, "add_to_basket", product_ids=["fx-cleanser"])
    await _call(session, "show_tutorials", product_ids=["fx-rich-dry", "fx-cleanser"])
    asked = "And your hair: how does it usually feel?"
    made_up = f"Here is how to use your routine. Scan code 5678 on your phone to watch. {asked}"
    honest = f"Here is how to use your routine: scan the QR codes on screen. {asked}"

    assert EXPERT.vet_reply(session, made_up) == (
        "Here's how to use your routine, with demos from @fixturebranda, Fixture Creator and "
        f"@fixturecreator: scan a QR code on screen to watch them on your phone. {asked}"
    )
    assert EXPERT.vet_reply(session, honest) == honest


def test_what_the_basket_shows_stays_out_of_the_expert_context():
    session = Session(id="s1", active_agent="skincare")
    profile = BeautyProfile(skin_type=SkinType.DRY)
    session.profile = from_basket(profile, [Decimal("14.21")], skin_products=1)

    block = EXPERT.context_block(session)

    assert session.profile.budget_band == "under_20"
    assert '"skin_type": "dry"' in block
    assert "budget_band" not in block and "routine_size" not in block and "inferred" not in block
