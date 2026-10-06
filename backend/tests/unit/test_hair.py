"""The hair bridge (spec 002, Cross-sell): once the tutorials are on screen, one question about
the visitor's hair, a haircare search and a suggestion, then the journey moves on."""

import json
from pathlib import Path

import pytest

from app.agents.skincare import HAIR_NOTES, build_skincare
from app.catalogue.ranking import SearchQuery, search
from app.catalogue.store import Catalogue
from app.conversation.agent import force
from app.conversation.session import Session
from app.tools import build_tools

CATALOGUE = Catalogue.load(Path("tests/fixtures/catalogue_fixture.json"))
EXPERT = build_skincare("test-model", build_tools(CATALOGUE))
ASKED = "Tutorials from CeraVe are on screen. And your hair, how does it usually feel?"


def _at(turn: int, *lines: tuple[str, str], **flags: object) -> Session:
    """A session at `turn`, past the skin search, with these lines as its history."""
    session = Session(id="s1", active_agent="skincare", turn_index=turn)
    session.flags.update({"last_search_turn": 2, **flags})
    session.history = [{"role": role, "content": text} for role, text in lines]
    return session


def _hair_notes(session: Session) -> list[str]:
    block = EXPERT.context_block(session)
    return [step for step, note in HAIR_NOTES.items() if note in block]


def test_the_turn_the_tutorials_show_asks_about_hair_with_no_tools():
    session = _at(5, ("user", "Yes please, add the cleanser."), tutorials_turn=5)

    assert _hair_notes(session) == ["ask"]
    assert EXPERT.tool_choice(session) == "none"


def test_that_turn_ends_on_the_hair_question_instead_of_any_other():
    session = _at(5, ("user", "Yes please, add the cleanser."), tutorials_turn=5)
    reply = "Done, your routine is complete. Tutorials are on screen. Shall I save your profile?"

    assert EXPERT.vet_reply(session, reply) == (
        "Done, your routine is complete. Tutorials are on screen. "
        "And your hair: how does it usually feel, dry, frizzy, or fine as it is?"
    )
    assert EXPERT.vet_reply(session, ASKED) == ASKED


@pytest.mark.parametrize(
    ("answer", "forced"),
    [
        ("It's wavy, and quite dry at the ends.", True),
        ("Ils sont plutôt secs, avec des frisottis.", True),
        ("No thanks, it's fine as it is.", False),
    ],
)
def test_an_answer_that_describes_the_hair_forces_the_haircare_search(answer: str, forced: bool):
    session = _at(6, ("user", "Add it."), ("assistant", ASKED), ("user", answer), tutorials_turn=5)

    assert _hair_notes(session) == ["search"]
    assert EXPERT.tool_choice(session) == (force("search_products") if forced else "auto")


def test_the_suggestion_then_the_answer_then_the_journey_moves_on():
    lines = (("user", "Add it."), ("assistant", ASKED), ("user", "Quite dry."))
    searched = {"search_turns": {"moisturiser": 2, "haircare": 6}, "last_search_turn": 6}
    session = _at(6, *lines, tutorials_turn=5, **searched)
    assert _hair_notes(session) == ["present"]
    assert EXPERT.tool_choice(session) == "auto"

    session.turn_index = 7
    assert _hair_notes(session) == ["decide"]

    session.turn_index = 8
    assert _hair_notes(session) == []


def test_the_suggestion_quotes_the_claim_of_the_first_result():
    first = {"name": "Hair Oil", "category": "haircare", "claims": [{"id": "c", "text": "Shiny."}]}
    lines = (("user", "Add it."), ("assistant", ASKED), ("user", "Quite dry."))
    session = _at(6, *lines, tutorials_turn=5, search_turns={"haircare": 6}, last_search_turn=6)
    session.history.append(
        {"role": "tool", "name": "search_products", "content": json.dumps({"results": [first]})}
    )

    assert "Name Hair Oil, then say what it does in the words of its approved claim" in (
        block := EXPERT.context_block(session)
    )
    assert 'word for word: "Shiny."' in block


def test_no_bridge_when_the_expert_asked_something_else():
    asked = "Tutorials are on screen. Would you like me to save your profile?"
    session = _at(
        6, ("user", "Add it."), ("assistant", asked), ("user", "I'm Camille."), tutorials_turn=5
    )

    assert _hair_notes(session) == []
    assert EXPERT.tool_choice(session) == "auto"


def test_a_haircare_search_ignores_the_skin_criteria():
    query = SearchQuery(
        category="haircare",
        skin_type="dry",
        sensitive=True,
        concerns=["dry_hair"],
        texture_preference="rich",
    )

    assert [product.id for product in search(CATALOGUE.all(), query, "en").products] == [
        "fx-hair-dry"
    ]
