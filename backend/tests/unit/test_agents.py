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


def test_skincare_has_the_six_expert_tools_in_order():
    skincare = build_skincare(MODEL, _tools())

    assert [tool.name for tool in skincare.tools] == [
        "search_products",
        "get_routine",
        "add_to_basket",
        "save_profile",
        "show_tutorials",
        "send_recap",
    ]


def test_skincare_instructions_mention_each_of_its_tools():
    skincare = build_skincare(MODEL, _tools())

    for tool_name in ("search_products", "get_routine", "add_to_basket", "save_profile"):
        assert tool_name in skincare.instructions


def test_skincare_tool_fillers_point_at_the_search_and_recap_filler_lines():
    skincare = build_skincare(MODEL, _tools())

    assert skincare.tool_fillers == {
        "search_products": "filler_search",
        "get_routine": "filler_search",
        "send_recap": "filler_recap",
    }


def test_skincare_has_exactly_its_filler_lines():
    skincare = build_skincare(MODEL, _tools())

    assert set(skincare.lines) == {"filler_search", "filler_recap"}


def test_skincare_fixed_line_matches_the_approved_copy():
    skincare = build_skincare(MODEL, _tools())

    assert skincare.lines["filler_search"] == {
        "en": "Let me look through our range for you.",
        "fr": "Je regarde ce que nous avons pour vous.",
    }


def test_skincare_voice_is_the_preset_jane_confident_id_in_both_languages():
    skincare = build_skincare(MODEL, _tools())

    assert skincare.voices == {
        "en": "cbe96cf0-85ec-4a10-accb-0b35c93b6dfd",
        "fr": "cbe96cf0-85ec-4a10-accb-0b35c93b6dfd",
    }


@pytest.mark.parametrize("turns", [0, 1, 2, 3])
def test_skincare_policy_is_auto_below_four_expert_turns(turns):
    skincare = build_skincare(MODEL, _tools())
    session = _session(active_since_turn=0, turn_index=turns)

    assert skincare.tool_choice(session) == "auto"


def test_skincare_policy_forces_search_at_four_expert_turns_without_a_search_yet():
    skincare = build_skincare(MODEL, _tools())
    session = _session(active_since_turn=0, turn_index=4)

    assert skincare.tool_choice(session) == force("search_products")


def test_skincare_policy_keeps_forcing_search_past_four_turns_until_one_runs():
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
