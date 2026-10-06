"""The skincare expert: diagnoses, searches the catalogue and builds a routine (spec 002).

The diagnosis comes first, the same way every time (`app/agents/diagnosis.py`): while a topic is
open the expert has no tools and the context names the topic to ask about; once it is complete,
the search is forced in that same turn. Once the routine's tutorials are on screen, the hair
bridge (`app/agents/hair.py`) names each of its steps in the context the same way.
"""

import json
import re
from collections.abc import Mapping

import structlog

from app.agents.diagnosis import ASKS, QUESTIONS, Topic, diagnosis_for
from app.agents.hair import HairStep, hair_pick, hair_search_due, hair_step, with_hair_question
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

# Expert turns (since the handoff) without a search before the loop forces one: the six
# diagnosis questions and one asked again.
TURNS_BEFORE_FORCED_SEARCH = 7
SEARCHED = "last_search_turn"  # set by search_products

# A named skin condition or a request for a cure, in English or French (claims policy).
MEDICAL = re.compile(
    r"eczema|eczéma|psoria|rosacea|rosacée|\bacne\b|\bacné|dermatit|allerg|\brash|urticai"
    r"|\bcure|\bheal|guéri|soigne",
    re.IGNORECASE,
)
TUTORIALS_NOTE = (
    "The routine is in the basket and no tutorials are on screen yet: call show_tutorials now "
    "with the ids of the products in the basket, then say in one sentence that tutorials from "
    "the brands and from creators are on screen, with a code to scan to watch them on their "
    "phone, and ask one short question about the visitor's hair."
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
    Topic.PRODUCT: {
        "en": "Which product are you looking for today: a moisturiser, a cleanser, a serum or a "
        "sunscreen?",
        "fr": "Quel produit recherchez-vous aujourd'hui : une crème hydratante, un nettoyant, un "
        "sérum ou une protection solaire ?",
    },
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
DIAGNOSED_NOTE = (
    "Diagnosis complete: call search_products now with what the visitor told you, then present "
    "the top pick."
)
# The hair bridge, one note per step: a question, a search, a suggestion, then the answer.
HAIR_NOTES: dict[HairStep, str] = {
    HairStep.ASK: (
        "The skin routine is complete and its tutorials are on screen. After your sentence about "
        "the tutorials, ask one short question about the visitor's hair: how it feels, or its "
        "type. Name no hair product yet, and do not ask about saving the profile yet."
    ),
    HairStep.SEARCH: (
        "The visitor answered your question about their hair. If they describe it, call "
        'search_products now with category "haircare" and their hair concerns (dry_hair, frizz '
        "or damaged_hair). If they want nothing for their hair, do not search: ask whether they "
        "would like you to save their skin profile and routine."
    ),
    HairStep.PRESENT: (
        "The haircare results are on screen. Suggest the first one with one approved claim, word "
        "for word, say in a few words that the product beside it goes with it, and ask whether "
        "they would like it in their selection. Nothing else."
    ),
    HairStep.DECIDE: (
        "The hair suggestion is on screen. If the visitor accepts it, call add_to_basket with the "
        "product they chose, unless it is in the basket already, and say in a few words that it is "
        "in their selection; if they decline, do not insist. Then ask whether they would like you "
        "to save their skin profile and routine."
    ),
}
# The suggestion quotes its claim from the search result: asked for "one approved claim", the
# model voiced the oil as "nourishes dry ends and adds shine" (golden run, 2026-10-06).
HAIR_PICK_NOTE = (
    "The haircare results are on screen. Name {name}, then say what it does in the words of its "
    'approved claim, the whole claim or the part that says what it does, word for word: "{claim}" '
    "Then say in a few words that the product beside it goes with it, and ask whether they would "
    "like it in their selection. Nothing else."
)


def _tool_choice(session: Session) -> ToolChoice:
    if SEARCHED in session.flags:
        if hair_step(session) is HairStep.ASK:
            return "none"  # the bridge opens with a question, never with a product
        if hair_search_due(session, _latest_visitor_text(session)):
            return force("search_products")
        return "auto"
    if _search_due(session):
        return force("search_products")
    return "none"  # the diagnosis is open: the expert asks its question and has no tools yet


def _search_due(session: Session) -> bool:
    """The diagnosis is complete, or seven expert turns passed without a search."""
    expert_turns = session.turn_index - session.active_since_turn
    return expert_turns >= TURNS_BEFORE_FORCED_SEARCH or diagnosis_for(session).complete


def _vet_reply(session: Session, text: str) -> str:
    """During the diagnosis, a reply that is not one short clean question on its topic becomes the
    topic's fixed question. The turn the hair bridge opens, the reply ends on the hair question."""
    if hair_step(session) is HairStep.ASK:
        return with_hair_question(session, text)
    if SEARCHED in session.flags or _search_due(session):
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
            *_hair_notes(session),
            *([MEDICAL_NOTE] if MEDICAL.search(_latest_visitor_text(session)) else []),
            *([EMAIL_NOTE] if _email_said(session) else []),
            *([RECAP_NOTE] if session.flags.get(RECAP_FLAG) else []),
        ]
    )


def _hair_notes(session: Session) -> list[str]:
    """This turn's step of the hair bridge, if it is open."""
    step = hair_step(session)
    if step is None:
        return []
    pick = hair_pick(session) if step is HairStep.PRESENT else None
    if pick is not None:
        return [HAIR_PICK_NOTE.format(name=pick[0], claim=pick[1])]
    return [HAIR_NOTES[step]]


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
