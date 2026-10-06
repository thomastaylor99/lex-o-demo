"""The routine (spec 002, Routine): once the visitor has chosen their first skin product, the
expert suggests the one product that completes the routine, adds it if they agree, then shows the
routine's tutorials, the same way every time (Thomas, 2026-10-06: the cream and one cleanser).

In Thomas's two runs of 2026-10-06 the cream chosen had no cleanser linked and the model filled
the gap: one run offered a cleanser and a serum, the other went straight to the tutorials with the
cream alone. The code picks each step from what the tools recorded; the model only words it.
"""

import re
from enum import StrEnum
from typing import Any

import structlog

from app.agents.wording import first_named, full_name, sentence
from app.conversation.agent import force
from app.conversation.session import Session
from app.conversation.stream import ToolChoice
from app.lang import Language
from app.tools.catalogue_tools import ROUTINE_PICK, ROUTINE_TURN, SKIN_CHOICE
from app.tools.tutorials import TUTORIALS_TURN

logger = structlog.get_logger()


class RoutineStep(StrEnum):
    FETCH = "fetch"  # the first skin product is in the basket: get_routine finds its partner
    OFFER = "offer"  # the partner showed this turn: suggest it
    DECIDE = "decide"  # the visitor answers the suggestion: add it if they agree
    SHOW = "show"  # the routine is settled: its tutorials


class Answer(StrEnum):
    YES = "yes"
    NO = "no"
    OTHER = "other"  # a question, or neither


# The visitor takes the suggestion, in English or French.
ACCEPTED = re.compile(
    r"\b(yes|yeah|yep|yup|sure|ok(?:ay)?|please|go ahead|sounds (?:good|great|lovely|perfect)|"
    r"(?:that|it)(?: would|'d)? be (?:great|good|lovely|perfect|nice)|"
    r"(?:that|it)['’]?s (?:great|good|perfect|fine|lovely)|why not|of course|"
    r"absolutely|definitely|perfect|great|lovely|good idea|let'?s do it|i'?ll take|"
    r"i'?d (?:love|like) (?:it|that|to)|add (?:it|that|them|the)|oui|ouais|volontiers|"
    r"d['’]accord|avec plaisir|je (?:veux bien|le prends|la prends)|parfait|bien sûr|allez-y|"
    r"ça marche|pourquoi pas|ajoutez)\b",
    re.IGNORECASE,
)
# The visitor turns it down. "That's good" stays out: here it takes the suggestion.
DECLINED = re.compile(
    r"\b(no|nope|nah|not (?:now|today|really|this time|for now)|i'?m (?:good|fine|ok(?:ay)?)|"
    r"i'?ll pass|i don'?t (?:need|want|think so)|maybe later|non|pas (?:besoin|maintenant|"
    r"pour l['’]instant|cette fois)|ça ira|sans façon|plus tard)\b",
    re.IGNORECASE,
)
# Other kinds of product the suggestion must leave out (a serum came with the cleanser on
# 2026-10-06).
OTHER_KINDS = re.compile(
    r"\b(serums?|sunscreens?|sun ?creams?|toners?|masks?|eye creams?|sérums?|solaires?|masques?)\b",
    re.IGNORECASE,
)

FETCH_NOTE = 'Routine: call get_routine now with product_id "{id}", the product the visitor chose.'
OFFER_NOTE = (
    "Routine: the visitor's choice is in their basket, and {name} completes their routine. Say in "
    "a few words that their choice is in their basket, then suggest {name} and say what it does "
    'in the words of its approved claim, word for word: "{claim}" Then ask whether they would '
    "like to add it too. Name no other product."
)
DECIDE_NOTE = (
    'Routine: you suggested {name} (id "{id}") to complete their routine. If the visitor accepts '
    "it, call add_to_basket with it; if they decline it, call show_tutorials; if they ask "
    "something, answer in one sentence and ask again whether they would like it."
)
ADD_NOTE = 'Routine: the visitor accepted {name}: call add_to_basket with ["{id}"].'
MOVE_ON_NOTE = (
    "Routine: move on from {name} without insisting: call show_tutorials with the products in "
    "their basket."
)
SHOW_NOTE = "Routine: call show_tutorials now with the ids of the products in the basket."
# Thomas liked "here's how to use your moisturiser, with demos from YouTube and creators" (live
# run, 2026-10-06), and wanted it for the whole routine. Told "a code to scan", the expert made up
# a number for it in 7 of 10 replays ("scan code 5678").
SHOWN_NOTE = (
    "The tutorials for the visitor's routine are on screen. Open your reply with one sentence "
    "saying here is how to use their routine, with demos from the brands and from creators (the "
    "tool result names them), and that they can scan the QR codes on screen to watch them on "
    "their phone. Never make up a code or a number."
)
SHOWN: dict[Language, str] = {
    "en": "Here's how to use your routine, with demos from {names}: scan a QR code on screen to "
    "watch them on your phone.",
    "fr": "Voici comment utiliser votre routine, avec des démonstrations de {names} : scannez un "
    "QR code à l'écran pour les regarder sur votre téléphone.",
}
AND: dict[Language, str] = {"en": "and", "fr": "et"}
# A sentence that gives the code a number.
NUMBERED_CODE = re.compile(r"\bcodes?\b[^.?!]*\d|\d[^.?!]*\bcodes?\b", re.IGNORECASE)
# The reply's other sentences about the tutorials, which the fixed sentence replaces too.
ABOUT_TUTORIALS = re.compile(
    r"\b(demos?|tutorials?|how to use|scan\w*|watch|démonstrations?|tutoriels?|regarder)\b",
    re.IGNORECASE,
)
SENTENCE_END = re.compile(r"(?<=[.!?])\s+")
# The suggestion when the expert's own reply names something else or asks nothing.
OFFER: dict[Language, str] = {
    "en": "It's in your basket. To complete your routine, I'd suggest {name}. {claim}Would you "
    "like to add it too?",
    "fr": "C'est dans votre panier. Pour compléter votre routine, je vous propose {name}. "
    "{claim}Voulez-vous l'ajouter aussi ?",
}


def routine_step(session: Session) -> RoutineStep | None:
    """Where the routine stands this round: None before the first skin choice and once its
    tutorials step has run."""
    flags = session.flags
    choice = flags.get(SKIN_CHOICE)
    if choice is None or flags.get(TUTORIALS_TURN) is not None:
        return None
    offered = flags.get(ROUTINE_TURN)
    if offered is None or offered < choice["turn"]:
        return None if _called_this_turn(session, "get_routine") else RoutineStep.FETCH
    pick = flags.get(ROUTINE_PICK)
    settled = pick is None or _in_basket(session, pick["id"])
    if not settled and offered == session.turn_index:
        return RoutineStep.OFFER
    if settled or _called_this_turn(session, "add_to_basket"):
        return None if _called_this_turn(session, "show_tutorials") else RoutineStep.SHOW
    return RoutineStep.DECIDE


def answer(text: str) -> Answer:
    """What the visitor's line says to the suggestion: a question is neither yes nor no."""
    if "?" in text:
        return Answer.OTHER
    yes, no = ACCEPTED.search(text) is not None, DECLINED.search(text) is not None
    if yes and not no:
        return Answer.YES
    if no and not yes:
        return Answer.NO
    return Answer.OTHER


def routine_choice(session: Session) -> ToolChoice | None:
    """This round's tool choice while the routine is open; None leaves it to the other steps."""
    step = routine_step(session)
    if step is RoutineStep.FETCH:
        return force("get_routine")
    if step is RoutineStep.OFFER:
        return "none"
    if step is RoutineStep.SHOW:
        return force("show_tutorials")
    if step is RoutineStep.DECIDE:
        said = _decision(session)
        if said is Answer.YES:
            return force("add_to_basket")
        return force("show_tutorials") if said is Answer.NO else "auto"
    return None


def routine_notes(session: Session) -> list[str]:
    """This round's routine note for the context section."""
    step = routine_step(session)
    pick: dict[str, Any] | None = session.flags.get(ROUTINE_PICK)
    if step is RoutineStep.FETCH:
        return [FETCH_NOTE.format(id=session.flags[SKIN_CHOICE]["id"])]
    if step is RoutineStep.SHOW:
        return [SHOW_NOTE]
    if pick is not None and step is RoutineStep.OFFER:
        return [OFFER_NOTE.format(name=full_name(pick), claim=_claim(pick))]
    if pick is not None and step is RoutineStep.DECIDE:
        said = _decision(session)
        note = {Answer.YES: ADD_NOTE, Answer.NO: MOVE_ON_NOTE}.get(said, DECIDE_NOTE)
        return [note.format(name=full_name(pick), id=pick["id"])]
    shown = session.flags.get(TUTORIALS_TURN) == session.turn_index
    return [SHOWN_NOTE] if shown and session.flags.get("shown_tutorials") else []


def vet_offer(session: Session, text: str) -> str:
    """The suggestion names the product that completes the routine, asks, and names no other
    product to buy; otherwise the fixed suggestion replaces it."""
    pick: dict[str, Any] = session.flags[ROUTINE_PICK]
    basket = {item.product_id for item in session.basket.items}
    others = [
        view
        for view in session.flags.get("last_results") or []
        if view["id"] != pick["id"] and view["id"] not in basket
    ]
    clean = (
        "?" in text
        and first_named(text, [pick]) == pick["id"]
        and first_named(text, others) is None
        and not OTHER_KINDS.search(text)
    )
    if clean:
        return text
    logger.warning("routine_offer_replaced", session_id=session.id, reply=text)
    claim = f"{_claim(pick)} " if pick["claims"] else ""
    return OFFER[session.language].format(name=full_name(pick), claim=claim)


def vet_shown(session: Session, text: str) -> str:
    """The turn the tutorials show: a sentence that gives their code a number becomes the fixed
    sentence about the tutorials."""
    shown = session.flags.get("shown_tutorials") or []
    if session.flags.get(TUTORIALS_TURN) != session.turn_index or not shown:
        return text
    sentences = SENTENCE_END.split(text.strip())
    if not any(NUMBERED_CODE.search(s) for s in sentences):
        return text
    logger.warning("tutorials_code_replaced", session_id=session.id, reply=text)
    names = list(dict.fromkeys(tutorial["creator"] for tutorial in shown))
    listed = names[-1]
    if len(names) > 1:
        listed = f"{', '.join(names[:-1])} {AND[session.language]} {names[-1]}"
    fixed = SHOWN[session.language].format(names=listed)
    said: list[str] = []
    for part in sentences:
        if not (NUMBERED_CODE.search(part) or ABOUT_TUTORIALS.search(part)):
            said.append(part)
        elif fixed not in said:
            said.append(fixed)  # in place of the first sentence about the tutorials
    return " ".join(said)


def _decision(session: Session) -> Answer:
    """The visitor's answer to the suggestion; a second turn without a yes moves on."""
    said = answer(_latest_visitor_text(session))
    if said is Answer.OTHER and session.turn_index - session.flags[ROUTINE_TURN] >= 2:
        return Answer.NO
    return said


def _claim(pick: dict[str, Any]) -> str:
    return sentence(pick["claims"][0]["text"]) if pick["claims"] else ""


def _in_basket(session: Session, product_id: str) -> bool:
    return any(item.product_id == product_id for item in session.basket.items)


def _called_this_turn(session: Session, name: str) -> bool:
    """A tool of that name was called since the visitor's latest line."""
    users = [i for i, message in enumerate(session.history) if message["role"] == "user"]
    later = session.history[users[-1] + 1 :] if users else session.history
    return any(
        call["function"]["name"] == name
        for message in later
        if message["role"] == "assistant"
        for call in message.get("tool_calls") or []
    )


def _latest_visitor_text(session: Session) -> str:
    return next((m["content"] for m in reversed(session.history) if m["role"] == "user"), "")
