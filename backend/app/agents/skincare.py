"""The skincare expert: diagnoses, searches the catalogue and builds a routine (spec 002).

The diagnosis comes first, the same way every time (`app/agents/diagnosis.py`): while a topic is
open the expert has no tools and the context names the topic to ask about; once it is complete,
the search is forced in that same turn.
"""

import json
import re
from collections.abc import Mapping
from typing import Any

import structlog

from app.agents.diagnosis import ASKS, QUESTIONS, Topic, diagnosis_for
from app.agents.prompts import LINES, SKINCARE_INSTRUCTIONS
from app.agents.voices import SKINCARE_VOICES
from app.conversation.agent import AgentConfig, Tool, force
from app.conversation.session import Session
from app.conversation.stream import ToolChoice
from app.lang import LANGUAGE_NAMES, Language
from app.profile.models import Consent
from app.recap.email import redact_emails
from app.recap.service import RECAP_FLAG

logger = structlog.get_logger()

# Expert turns (since the handoff) without a search before the loop forces one: the five
# diagnosis questions and one asked again.
TURNS_BEFORE_FORCED_SEARCH = 6
SEARCHED = "last_search_turn"  # set by search_products

# A named skin condition or a request for a cure, in English or French (claims policy).
MEDICAL = re.compile(
    r"eczema|eczéma|psoria|rosacea|rosacée|\bacne\b|\bacné|dermatit|allerg|\brash|urticai"
    r"|\bcure|\bheal|guéri|soigne",
    re.IGNORECASE,
)
TUTORIALS_NOTE = (
    "The routine is in the basket and no tutorials are on screen yet: call show_tutorials now "
    "with the ids of the products in the basket, and mention the tutorials in one sentence."
)
# A reply that announces a search or an action ("let me find", "one moment") instead of taking it.
PROMISE = re.compile(
    r"\b(let me (find|look|check|search|see|pull|get|add|put)|one moment|just a moment|"
    r"give me a (moment|second)|i'?ll (find|look|check|search|add|put)|"
    r"je (regarde|cherche|vérifie|vais (chercher|regarder|voir|ajouter))|un instant|laissez-moi)\b",
    re.IGNORECASE,
)
MEDICAL_NOTE = (
    "The visitor named a skin condition or asked for a cure. Start the reply by saying you can't "
    "give medical advice and that a pharmacist or a dermatologist is the right person to ask, "
    "then offer help with products for their skin type, without saying what any product does "
    "(no effect such as soothing or calming)."
)
# The visitor starts giving an email address aloud; the field on screen takes it (spec 006).
EMAIL_WORDS = re.compile(r"e-?mail|courriel|@|\barr?obase\b", re.IGNORECASE)
EMAIL_NOTE = (
    "The visitor is giving an email address aloud. Do not repeat or spell it: ask them in one "
    "sentence to type it in the field on the screen."
)
RECAP_NOTE = (
    "The recap and the in-store offer are on screen, from the address the visitor typed. Do not "
    "offer them again; close with a short thank you unless the visitor asks for something else."
)
ASK_NOTE = (
    "Diagnosis: reply with one short question about {topic}, picking up what the visitor just "
    "said. Name and recommend no product: the search runs once the diagnosis is complete."
)
ASK_AGAIN_NOTE = (
    "Diagnosis: the visitor asked something instead of answering. Answer in one sentence, then "
    "ask again about {topic}. Name and recommend no product: the search runs once the diagnosis "
    "is complete."
)
# A diagnosis reply that names a product, a brand or a tool, or asks nothing, is replaced by its
# topic's question: when it judged the diagnosis complete, the model sometimes wrote the search
# out as text and made up a top pick (golden runs, 2026-10-05).
OFF_SCRIPT = re.compile(
    r"search_|get_routine|add_to_basket|save_profile|show_tutorials|top pick|recommend|"
    r"alternatives?\b|on screen|let me show|\b(?:revitalift|toleriane|anthelios|elvive|elseve|"
    r"cerave|la roche|garnier|vichy|lanc[oô]me|kiehl|nivea|eucerin|neutrogena|olay|aveeno|"
    r"cetaphil|av[eè]ne|bioderma|clinique|clarins|nuxe|uriage|the ordinary)",
    re.IGNORECASE,
)
MAX_QUESTION_WORDS = 60
INTRO: dict[Language, str] = {
    "en": "I'm L'Oréal's AI skincare expert. ",
    "fr": "Je suis l'experte soin de L'Oréal, une intelligence artificielle. ",
}
FIXED_QUESTIONS: dict[Topic, dict[Language, str]] = {
    Topic.SKIN_TYPE: {
        "en": "How does your skin usually feel by the end of the day: dry, oily, combination or "
        "normal?",
        "fr": "Comment est votre peau en fin de journée : sèche, grasse, mixte ou normale ?",
    },
    Topic.REDNESS: {
        "en": "Does your skin ever redden, sting or react when you apply a cream?",
        "fr": "Votre peau rougit-elle, picote-t-elle ou réagit-elle quand vous appliquez une "
        "crème ?",
    },
    Topic.CURRENT_PRODUCT: {
        "en": "Which moisturiser do you use at the moment, and how do you find it?",
        "fr": "Quelle crème hydratante utilisez-vous en ce moment, et qu'en pensez-vous ?",
    },
    Topic.TEXTURE: {
        "en": "Do you prefer a light texture or a rich cream?",
        "fr": "Préférez-vous une texture légère ou une crème riche ?",
    },
    Topic.AGE: {
        "en": "Last question, only if you're happy to share: roughly how old are you? A decade is "
        "enough.",
        "fr": "Dernière question, seulement si vous le souhaitez : quel âge avez-vous, à peu "
        "près ? Une décennie suffit.",
    },
}
# The top pick's presentation when the expert's own reply presents another product.
PRESENT: dict[Language, str] = {
    "en": "My top pick for you is {name}.",
    "fr": "Mon premier choix pour vous : {name}.",
}
ALTERNATIVES: dict[Language, dict[int, str]] = {
    "en": {1: "One alternative is on screen.", 2: "Two alternatives are on screen."},
    "fr": {1: "Une autre option est à l'écran.", 2: "Deux autres options sont à l'écran."},
}
ASK_OPINION: dict[Language, str] = {"en": "What do you think?", "fr": "Qu'en pensez-vous ?"}
DIAGNOSED_NOTE = (
    "Diagnosis complete: call search_products now with what the visitor told you, then present "
    "the top pick."
)


def _tool_choice(session: Session) -> ToolChoice:
    if SEARCHED in session.flags:
        return "auto"
    if _search_due(session):
        return force("search_products")
    return "none"  # the diagnosis is open: the expert asks its question and has no tools yet


def _search_due(session: Session) -> bool:
    """The diagnosis is complete, or six expert turns passed without a search."""
    expert_turns = session.turn_index - session.active_since_turn
    return expert_turns >= TURNS_BEFORE_FORCED_SEARCH or diagnosis_for(session).complete


def _vet_reply(session: Session, text: str) -> str:
    """The diagnosis gets clean questions, and a search turn presents the screen's top pick."""
    if SEARCHED in session.flags:
        return _vet_pick(session, text)
    if _search_due(session):
        return text
    topic = diagnosis_for(session).asking
    if topic is None:
        return text
    clean = (
        "?" in text
        and len(text.split()) <= MAX_QUESTION_WORDS
        and ASKS[topic].search(text) is not None
        and not OFF_SCRIPT.search(text)
    )
    if clean:
        return text
    logger.warning("diagnosis_reply_replaced", session_id=session.id, topic=topic, reply=text)
    intro = INTRO[session.language] if session.turn_index == session.active_since_turn else ""
    return intro + FIXED_QUESTIONS[topic][session.language]


def _vet_pick(session: Session, text: str) -> str:
    """In the turn of a search, the reply must name the screen's top pick before any other result;
    otherwise the top pick's fixed presentation replaces it (Thomas's run, 2026-10-06: the expert
    praised the second result while the screen marked the first "Top pick")."""
    views: list[dict[str, Any]] = session.flags.get("last_results") or []
    if session.flags.get(SEARCHED) != session.turn_index or not views:
        return text
    if _first_named(text, views) == views[0]["id"]:
        return text
    logger.warning("top_pick_reply_replaced", session_id=session.id, reply=text)
    return _presentation(views, session.language)


def _first_named(text: str, views: list[dict[str, Any]]) -> str | None:
    """The id of the result the text names first, by its full name or its first words."""
    said = _plain(text)
    found: list[tuple[int, int, str]] = []  # (position, minus the length matched, id)
    for view in views:
        words = _plain(view["name"]).split()
        others = [_plain(other["name"]) for other in views if other is not view]
        size = 2
        while size < len(words) and any(o.startswith(" ".join(words[:size])) for o in others):
            size += 1
        for form in {" ".join(words), " ".join(words[:size])}:
            at = said.find(form)
            if at >= 0:
                found.append((at, -len(form), view["id"]))
    return min(found)[2] if found else None


def _plain(text: str) -> str:
    """Lower case, straight apostrophes, hyphens as spaces, single spaces."""
    text = text.lower().replace("’", "'").replace("-", " ")
    return " ".join(text.split())


def _presentation(views: list[dict[str, Any]], language: Language) -> str:
    """The top pick by its full name, its fit to the visitor, an approved claim word for word."""
    pick = views[0]
    parts = [PRESENT[language].format(name=f"{pick['brand']} {pick['name']}")]
    if pick.get("fit"):
        parts.append(_sentence(pick["fit"]))
    if pick["claims"]:
        parts.append(_sentence(pick["claims"][0]["text"]))
    alternatives = len(views) - 1
    if alternatives:
        parts.append(ALTERNATIVES[language][min(alternatives, 2)])
    parts.append(ASK_OPINION[language])
    return " ".join(parts)


def _sentence(text: str) -> str:
    text = text.strip()
    return text if text.endswith((".", "!", "?")) else f"{text}."


def _diagnosis_notes(session: Session) -> list[str]:
    """What the expert asks this turn, until the first search has run."""
    if SEARCHED in session.flags:
        return []
    if _search_due(session):
        return [DIAGNOSED_NOTE]
    diagnosis = diagnosis_for(session)
    topic = QUESTIONS[diagnosis.asking] if diagnosis.asking else ""
    return [(ASK_AGAIN_NOTE if diagnosis.asked_again else ASK_NOTE).format(topic=topic)]


def _context_block(session: Session) -> str:
    profile = session.profile.model_dump(mode="json", exclude_none=True, exclude_defaults=True)
    shown_ids = session.flags.get("shown_ids", [])
    return "\n".join(
        [
            f"Reply language: {LANGUAGE_NAMES[session.language]}.",
            f"Concierge summary: {session.flags.get('handover_summary') or 'none'}",
            f"Visitor profile so far: {json.dumps(profile, ensure_ascii=False)}",
            f"Basket: {json.dumps(session.basket.view(), ensure_ascii=False)}",
            f"Products already shown: {', '.join(shown_ids) or 'none'}",
            *_diagnosis_notes(session),
            *([TUTORIALS_NOTE] if _tutorials_due(session) else []),
            *([MEDICAL_NOTE] if MEDICAL.search(_latest_visitor_text(session)) else []),
            *([EMAIL_NOTE] if _email_said(session) else []),
            *([RECAP_NOTE] if session.flags.get(RECAP_FLAG) else []),
        ]
    )


def _tutorials_due(session: Session) -> bool:
    """A routine (two products or more) is in the basket and its tutorials were never shown."""
    return len(session.basket.items) >= 2 and not session.flags.get("shown_tutorials")


def _email_said(session: Session) -> bool:
    """After consent and before the recap, the visitor's latest words mention or hold an address."""
    if session.profile.consent != Consent.GIVEN or session.flags.get(RECAP_FLAG):
        return False
    text = _latest_visitor_text(session)
    return bool(EMAIL_WORDS.search(text)) or redact_emails(text) != text


def _latest_visitor_text(session: Session) -> str:
    return next((m["content"] for m in reversed(session.history) if m["role"] == "user"), "")


def build_skincare(model: str, tools: Mapping[str, Tool]) -> AgentConfig:
    return AgentConfig(
        id="skincare",
        display_name={"en": "Skincare expert", "fr": "Experte soin"},
        role_label={"en": "Skincare", "fr": "Soin"},
        model=model,
        instructions=SKINCARE_INSTRUCTIONS,
        tools=(
            tools["search_products"],
            tools["get_routine"],
            tools["add_to_basket"],
            tools["save_profile"],
            tools["show_tutorials"],
        ),
        tool_choice=_tool_choice,
        voices=SKINCARE_VOICES,
        lines=LINES["skincare"],
        context_block=_context_block,
        promises_action=lambda text: bool(PROMISE.search(text)),
        vet_reply=_vet_reply,
        tool_fillers={"search_products": "filler_search", "get_routine": "filler_search"},
    )
