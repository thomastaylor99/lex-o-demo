"""Tests for the concierge and skincare agent configurations (spec 002)."""

import json
from pathlib import Path

import pytest

from app.agents import FIRST_AGENT, build_agents
from app.agents.concierge import build_concierge
from app.agents.skincare import build_skincare
from app.catalogue.store import Catalogue
from app.conversation.agent import AgentConfig, force
from app.conversation.session import Session
from app.lang import LANGUAGES
from app.profile.models import Consent
from app.recap.service import RECAP_FLAG
from app.settings import Settings
from app.tools import build_tools

CATALOGUE_PATH = Path("tests/fixtures/catalogue_fixture.json")
MODEL = "test-model"


def _tools() -> dict[str, object]:
    return build_tools(Catalogue.load(CATALOGUE_PATH))


def _session(**overrides: object) -> Session:
    fields: dict[str, object] = {"id": "s1", "active_agent": "skincare"}
    fields.update(overrides)
    return Session(**fields)


def _agents() -> dict[str, AgentConfig]:
    return {
        "concierge": build_concierge(MODEL, _tools()),
        "skincare": build_skincare(MODEL, _tools()),
    }


# ------------------------------------------------------------------- concierge


def test_concierge_identity_and_transfer_targets():
    concierge = build_concierge(MODEL, _tools())

    assert concierge.id == "concierge"
    assert concierge.model == MODEL
    assert concierge.display_name == {"en": "Beauty concierge", "fr": "Concierge beauté"}
    assert concierge.role_label == {"en": "Welcome", "fr": "Accueil"}
    assert concierge.transfer_targets == ("skincare",)


def test_concierge_has_only_the_transfer_tool():
    concierge = build_concierge(MODEL, _tools())

    assert [tool.name for tool in concierge.tools] == ["transfer_to_agent"]


def test_concierge_instructions_mention_its_only_tool():
    concierge = build_concierge(MODEL, _tools())

    assert "transfer_to_agent" in concierge.instructions


@pytest.mark.parametrize(
    "overrides",
    [
        {},
        {"language": "fr"},
        {"turn_index": 5, "active_since_turn": 0},
        {"flags": {"clarified": True}},
        {"active_agent": "concierge", "turn_index": 1, "active_since_turn": 1},
    ],
    ids=["fresh", "french", "many_turns", "already_clarified_once", "mid_conversation"],
)
def test_concierge_always_forces_transfer(overrides):
    concierge = build_concierge(MODEL, _tools())
    session = _session(**overrides)

    assert concierge.tool_choice(session) == force("transfer_to_agent")


@pytest.mark.parametrize("language, expected", [("en", "English"), ("fr", "French")])
def test_concierge_context_block_names_the_reply_language(language, expected):
    concierge = build_concierge(MODEL, _tools())
    session = _session(language=language)

    assert concierge.context_block(session) == f"Reply language: {expected}."


def test_concierge_voice_is_the_preset_oliver_cheerful_id_in_both_languages():
    concierge = build_concierge(MODEL, _tools())

    assert concierge.voices == {
        "en": "5ad5d44e-6b4e-4a57-a8a8-4cae088034ed",
        "fr": "5ad5d44e-6b4e-4a57-a8a8-4cae088034ed",
    }


def test_concierge_has_exactly_its_three_lines():
    concierge = build_concierge(MODEL, _tools())

    assert set(concierge.lines) == {"welcome", "clarify", "handover_skincare"}


def test_concierge_fixed_lines_match_the_approved_copy():
    concierge = build_concierge(MODEL, _tools())

    assert concierge.lines["welcome"] == {
        "en": "Welcome to L'Oréal! I'm your AI beauty concierge. What are you looking for today?",
        "fr": (
            "Bienvenue chez L'Oréal ! Je suis votre concierge beauté, une intelligence "
            "artificielle. Que recherchez-vous aujourd'hui ?"
        ),
    }
    assert concierge.lines["clarify"] == {
        "en": "Happy to help. Tell me a little more about what you'd like to find today.",
        "fr": "Avec plaisir. Dites-m'en un peu plus sur ce que vous aimeriez trouver aujourd'hui.",
    }
    assert concierge.lines["handover_skincare"] == {
        "en": "Lovely. Let me bring in our skincare expert.",
        "fr": "Très bien. Je vous passe notre spécialiste du soin de la peau.",
    }


# -------------------------------------------------------------------- skincare


def test_skincare_identity():
    skincare = build_skincare(MODEL, _tools())

    assert skincare.id == "skincare"
    assert skincare.model == MODEL
    assert skincare.display_name == {"en": "Skincare expert", "fr": "Experte soin"}
    assert skincare.role_label == {"en": "Skincare", "fr": "Soin"}
    assert skincare.transfer_targets == ()


def test_skincare_has_the_five_expert_tools_in_order():
    skincare = build_skincare(MODEL, _tools())

    assert [tool.name for tool in skincare.tools] == [
        "search_products",
        "get_routine",
        "add_to_basket",
        "save_profile",
        "show_tutorials",
    ]


def test_skincare_instructions_mention_each_of_its_tools():
    skincare = build_skincare(MODEL, _tools())

    for tool_name in ("search_products", "get_routine", "add_to_basket", "save_profile"):
        assert tool_name in skincare.instructions


def test_skincare_tool_fillers_point_at_the_search_filler_line():
    skincare = build_skincare(MODEL, _tools())

    assert skincare.tool_fillers == {
        "search_products": "filler_search",
        "get_routine": "filler_search",
    }


def test_skincare_has_exactly_its_fixed_lines():
    """The browser plays the two recap lines around POST /sessions/{id}/recap."""
    skincare = build_skincare(MODEL, _tools())

    assert set(skincare.lines) == {"filler_search", "filler_recap", "recap_ready", "recap_failed"}


def test_skincare_says_it_is_an_ai_and_names_the_groupe_only_when_it_applies():
    instructions = build_skincare(MODEL, _tools()).instructions

    assert (
        "asks whether they are\n  talking to a person. Do not say it at any other time."
        in instructions
    )
    assert "When the visitor says they use one, thank them for telling you" in instructions
    assert "they ask you about one, say you can only advise on L'Oréal Groupe" in instructions
    assert "send_recap" not in instructions
    assert "type their email address in the field on\n   the screen" in instructions


def test_skincare_fixed_line_matches_the_approved_copy():
    skincare = build_skincare(MODEL, _tools())

    assert skincare.lines["filler_search"] == {
        "en": "Let me look through our range for you.",
        "fr": "Je regarde ce que nous avons pour vous.",
    }


def test_skincare_voice_is_the_preset_jane_neutral_id_in_both_languages():
    skincare = build_skincare(MODEL, _tools())

    assert skincare.voices == {
        "en": "82c99ee6-f932-423f-a4a3-d403c8914b8d",
        "fr": "82c99ee6-f932-423f-a4a3-d403c8914b8d",
    }


def _said(*lines: str) -> list[dict[str, str]]:
    return [{"role": "user", "content": line} for line in lines]


@pytest.mark.parametrize("turns", [0, 1, 2, 3, 4, 5])
def test_skincare_has_no_tools_while_the_diagnosis_is_open(turns):
    skincare = build_skincare(MODEL, _tools())
    session = _session(active_since_turn=0, turn_index=turns, history=_said("A moisturiser."))

    assert skincare.tool_choice(session) == "none"


def test_skincare_policy_forces_search_once_the_diagnosis_is_complete():
    skincare = build_skincare(MODEL, _tools())
    said = _said("I'm 42 and I use a rich cream for my dry skin, which gets red easily.")
    session = _session(active_since_turn=0, turn_index=0, history=said)

    assert skincare.tool_choice(session) == force("search_products")
    assert "Diagnosis complete: call search_products now" in skincare.context_block(session)


def test_skincare_context_names_one_topic_at_a_time_in_order():
    skincare = build_skincare(MODEL, _tools())
    session = _session(active_since_turn=1, turn_index=1, history=_said("Hi.", "A moisturiser."))
    assert "one short question about how their skin usually feels" in skincare.context_block(
        session
    )

    session.history += _said("Quite dry, I'd say.")
    session.turn_index = 2
    assert "whether their skin reddens" in skincare.context_block(session)

    session.history += _said("No, never.")
    session.turn_index = 3
    assert "which moisturiser they use at the moment" in skincare.context_block(session)

    session.history += _said("Nothing special.")
    session.turn_index = 4
    assert "whether they prefer a light or a rich texture" in skincare.context_block(session)
    assert skincare.tool_choice(session) == "none"

    session.history += _said("Light, please.")
    session.turn_index = 5
    assert "their age range, saying it is optional" in skincare.context_block(session)

    session.history += _said("I'd rather not say.")
    session.turn_index = 6
    assert skincare.tool_choice(session) == force("search_products")


def test_skincare_context_drops_the_diagnosis_once_a_search_ran():
    skincare = build_skincare(MODEL, _tools())
    session = _session(history=_said("A moisturiser."), flags={"last_search_turn": 0})

    assert "Diagnosis" not in skincare.context_block(session)
    assert skincare.tool_choice(session) == "auto"


def test_skincare_policy_forces_search_at_six_expert_turns_without_a_search_yet():
    skincare = build_skincare(MODEL, _tools())
    session = _session(active_since_turn=0, turn_index=6)

    assert skincare.tool_choice(session) == force("search_products")


def test_skincare_policy_keeps_forcing_search_past_six_turns_until_one_runs():
    skincare = build_skincare(MODEL, _tools())
    session = _session(active_since_turn=2, turn_index=9)

    assert skincare.tool_choice(session) == force("search_products")


def test_skincare_policy_returns_to_auto_once_last_search_turn_is_set():
    skincare = build_skincare(MODEL, _tools())
    session = _session(active_since_turn=0, turn_index=4, flags={"last_search_turn": 4})

    assert skincare.tool_choice(session) == "auto"


@pytest.mark.parametrize("language, expected", [("en", "English"), ("fr", "French")])
def test_skincare_context_block_names_the_reply_language(language, expected):
    skincare = build_skincare(MODEL, _tools())
    session = _session(language=language)

    assert f"Reply language: {expected}." in skincare.context_block(session)


def test_skincare_context_block_contains_the_handover_summary():
    skincare = build_skincare(MODEL, _tools())
    session = _session(flags={"handover_summary": "Looking for a moisturiser."})

    assert "Concierge summary: Looking for a moisturiser." in skincare.context_block(session)


def test_skincare_context_block_defaults_the_summary_to_none():
    skincare = build_skincare(MODEL, _tools())
    session = _session()

    assert "Concierge summary: none" in skincare.context_block(session)


def test_skincare_context_block_lists_profile_basket_and_shown_products():
    skincare = build_skincare(MODEL, _tools())
    session = _session(flags={"shown_ids": ["fx-rich-dry", "fx-cleanser"]})
    session.profile.first_name = "Alex"

    block = skincare.context_block(session)

    assert json.dumps({"first_name": "Alex"}, ensure_ascii=False) in block
    assert json.dumps(session.basket.view(), ensure_ascii=False) in block
    assert "Products already shown: fx-rich-dry, fx-cleanser" in block


def test_skincare_context_block_defaults_shown_products_to_none():
    skincare = build_skincare(MODEL, _tools())
    session = _session()

    assert "Products already shown: none" in skincare.context_block(session)


# ---------------------------------------------------------------- every agent


def test_every_agent_has_every_line_in_english_and_french():
    for agent in _agents().values():
        for line_id, translations in agent.lines.items():
            for language in LANGUAGES:
                assert translations.get(language), f"{agent.id}.{line_id} missing {language}"


def test_every_tool_filler_points_at_a_line_the_agent_has():
    for agent in _agents().values():
        for tool_name, line_id in agent.tool_fillers.items():
            assert line_id in agent.lines, f"{agent.id}: filler for {tool_name} has no line"


def test_every_agent_has_non_empty_voices_in_english_and_french():
    for agent in _agents().values():
        for language in LANGUAGES:
            assert agent.voices.get(language), f"{agent.id} has no {language} voice"


# -------------------------------------------------------------- build_agents


def test_build_agents_returns_both_ids_with_the_settings_model():
    settings = Settings(agent_model="custom-model")

    agents = build_agents(settings, _tools())

    assert set(agents) == {"concierge", "skincare"}
    assert agents["concierge"].model == "custom-model"
    assert agents["skincare"].model == "custom-model"


def test_first_agent_is_concierge():
    assert FIRST_AGENT == "concierge"


def test_skincare_context_asks_for_tutorials_once_the_routine_is_in_the_basket():
    catalogue = Catalogue.load(CATALOGUE_PATH)
    skincare = build_skincare(MODEL, _tools())
    session = _session()
    products = catalogue.all()[:2]
    session.basket.add(products[0], "en")
    assert "show_tutorials" not in skincare.context_block(session)

    session.basket.add(products[1], "en")
    assert "call show_tutorials now" in skincare.context_block(session)

    session.flags["shown_tutorials"] = [{"id": "t1"}]
    assert "show_tutorials" not in skincare.context_block(session)


@pytest.mark.parametrize(
    "said",
    [
        "Yes, my email is thomas.taylor",
        "thomas.taylor@mistral.ai.",
        "It's camille dot martin at example dot com",
        "Mon e-mail, c'est camille point martin arobase exemple point fr",
    ],
)
def test_skincare_context_asks_to_type_an_address_said_aloud_after_consent(said: str):
    skincare = build_skincare(MODEL, _tools())
    session = _session()
    session.history.append({"role": "user", "content": said})
    assert "type it in the field" not in skincare.context_block(session)  # no consent yet

    session.profile.consent = Consent.GIVEN
    assert "type it in the field on the screen" in skincare.context_block(session)

    session.flags[RECAP_FLAG] = "c***@example.com"
    block = skincare.context_block(session)
    assert "type it in the field" not in block
    assert "The recap and the in-store offer are on screen" in block


def test_skincare_context_has_no_email_note_for_other_words():
    skincare = build_skincare(MODEL, _tools())
    session = _session()
    session.profile.consent = Consent.GIVEN
    session.history.append({"role": "user", "content": "Not so much, I think we are good."})

    assert "type it in the field" not in skincare.context_block(session)


@pytest.mark.parametrize(
    ("reply", "promised"),
    [
        (
            "Let me find a gentle cleanser that pairs well with your new moisturiser. One moment.",
            True,
        ),
        ("Je regarde ce que nous avons pour vous.", True),
        ("Un instant, je cherche une crème.", True),
        ("Which skin type do you have?", False),
        ("My top pick is the Toleriane Sensitive Rich Moisturiser.", False),
    ],
)
def test_skincare_spots_a_reply_that_promises_an_action(reply: str, promised: bool) -> None:
    skincare = build_skincare(MODEL, _tools())
    assert skincare.promises_action is not None
    assert skincare.promises_action(reply) is promised


def test_a_diagnosis_reply_that_names_a_product_becomes_the_topic_question():
    skincare = build_skincare(MODEL, _tools())
    session = _session(active_since_turn=1, turn_index=2, history=_said("Hi.", "A cream."))
    made_up = "Your search is ready. My top pick is CeraVe Moisturising Cream. What do you think?"

    said = skincare.vet_reply(session, made_up)

    assert said.startswith("How does your skin usually feel by the end of the day")


def test_the_handover_turn_keeps_the_introduction_and_the_language():
    skincare = build_skincare(MODEL, _tools())
    session = _session(
        language="fr", active_since_turn=1, turn_index=1, history=_said("Une crème.")
    )

    said = skincare.vet_reply(session, "search_products category moisturiser")

    assert said.startswith("Je suis l'experte soin de L'Oréal")
    assert said.endswith("sèche, grasse, mixte ou normale ?")


def test_a_clean_diagnosis_question_on_its_topic_is_kept():
    skincare = build_skincare(MODEL, _tools())
    session = _session(active_since_turn=1, turn_index=2, history=_said("Hi.", "Quite dry."))
    question = "Thanks. Does your skin ever turn red when you apply a cream?"

    assert skincare.vet_reply(session, question) == question


def test_a_question_on_another_topic_becomes_the_topic_question():
    skincare = build_skincare(MODEL, _tools())
    session = _session(active_since_turn=1, turn_index=2, history=_said("Hi.", "Quite dry."))

    said = skincare.vet_reply(session, "Does your skin feel tight after your current cream?")

    assert said == "Does your skin ever redden, sting or react when you apply a cream?"


def test_replies_after_the_search_are_never_replaced():
    skincare = build_skincare(MODEL, _tools())
    session = _session(history=_said("A cream."), flags={"last_search_turn": 0})
    pick = "My top pick is CeraVe Moisturising Cream. Two alternatives are on screen."

    assert skincare.vet_reply(session, pick) == pick


# ------------------------------------------------------------- the top pick, said and shown


async def _searched(language: str = "en") -> tuple[AgentConfig, Session, list[dict[str, object]]]:
    """A session whose turn just ran a search: dry, sensitive, rich, so fx-rich-dry comes first."""
    tools = _tools()
    session = _session(language=language, turn_index=3, history=_said("Rich, please."))
    search = tools["search_products"]
    args = search.args_model(
        category="moisturiser", skin_type="dry", sensitive=True, texture_preference="rich"
    )
    await search.handler(session, args)
    return build_skincare(MODEL, tools), session, session.flags["last_results"]


async def test_a_reply_that_presents_the_top_pick_first_is_kept():
    skincare, session, views = await _searched()
    reply = f"My top pick is the {views[0]['name']}. Two alternatives are on screen."

    assert skincare.vet_reply(session, reply) == reply


async def test_a_reply_that_praises_another_result_presents_the_top_pick_instead():
    skincare, session, views = await _searched()
    reply = f"My top pick is the {views[1]['name']}. What do you think?"

    said = skincare.vet_reply(session, reply)

    assert said.startswith(f"My top pick for you is {views[0]['brand']} {views[0]['name']}.")
    assert views[0]["claims"][0]["text"] in said
    assert said.endswith("What do you think?")


async def test_a_reply_that_names_no_result_presents_the_top_pick_in_french():
    skincare, session, views = await _searched(language="fr")

    said = skincare.vet_reply(session, "Voici ce que je vous propose.")

    assert said.startswith(f"Mon premier choix pour vous : {views[0]['brand']} {views[0]['name']}.")
    assert said.endswith("Qu'en pensez-vous ?")


async def test_replies_in_later_turns_are_left_alone():
    skincare, session, views = await _searched()
    session.turn_index += 1
    reply = f"The {views[1]['name']} is lighter, if you prefer."

    assert skincare.vet_reply(session, reply) == reply
