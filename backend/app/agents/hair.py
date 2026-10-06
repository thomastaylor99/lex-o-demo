"""The hair bridge (spec 002, Cross-sell): once the skin routine is in the basket and its
tutorials are on screen, the skincare expert asks one question about the visitor's hair, suggests
the catalogue's haircare, adds it if the visitor agrees and moves on, two turns at most, in the
same voice (Thomas, 2026-10-06).

The code picks each step from what the tools recorded; the model only words it.
"""

import json
import re
from enum import StrEnum

from app.catalogue.models import Category
from app.conversation.session import Session
from app.lang import Language
from app.tools.catalogue_tools import LAST_SEARCH_TURN, SEARCH_TURNS
from app.tools.tutorials import TUTORIALS_TURN


class HairStep(StrEnum):
    ASK = "ask"  # the tutorials showed this turn: one question about the visitor's hair
    SEARCH = "search"  # the visitor answered it: search haircare, unless they want nothing
    PRESENT = "present"  # the haircare results came this turn: suggest their top pick
    DECIDE = "decide"  # the suggestion is on screen: add it if they agree, then move on


# A question about the visitor's hair, in English or French.
HAIR = re.compile(r"\bhair\b|\bcheveux\b", re.IGNORECASE)
# Words that describe hair, in English or French. "Fine" stays out: "it's fine" declines.
DESCRIBED = re.compile(
    r"\b(dr(?:y|ie)\w*|frizz\w*|damaged|brittle|split ends?|breakage|dull|coarse|curl\w*|wavy|"
    r"straight|coily|thick|thin|oily|greasy|flat|tangl\w*|secs?|sèches?|frisott\w*|abîmés?|"
    r"cassants?|ternes?|boucl\w*|frisés?|ondulés?|raides?|épais|gras|emmêl\w*|crépus?)\b",
    re.IGNORECASE,
)
# A visitor who wants nothing for their hair.
DECLINED = re.compile(
    r"\b(no,? thanks?|no,? thank you|not really|nothing|i[’']?m (?:good|fine|ok|okay)|"
    r"(?:it|that)[’']?s (?:fine|ok|okay|good)|all good|non merci|pas besoin|rien|ça va)\b",
    re.IGNORECASE,
)
QUESTION: dict[Language, str] = {
    "en": "And your hair: how does it usually feel, dry, frizzy, or fine as it is?",
    "fr": "Et vos cheveux : comment sont-ils d'habitude, secs, avec des frisottis, ou très bien "
    "comme ça ?",
}
SENTENCE_END = re.compile(r"(?<=[.!?])\s+")


def hair_step(session: Session) -> HairStep | None:
    """Where the bridge stands this turn: None before the tutorials, and once it has closed."""
    shown = session.flags.get(TUTORIALS_TURN)
    if shown is None:
        return None
    turn = session.turn_index
    searched = session.flags.get(SEARCH_TURNS, {}).get(Category.HAIRCARE)
    if searched is not None:
        if searched < shown:
            return None  # hair came up before the routine was complete
        return {turn: HairStep.PRESENT, turn - 1: HairStep.DECIDE}.get(searched)
    if shown == turn:
        return HairStep.ASK
    if shown == turn - 1 and asks_about_hair(_previous_reply(session)):
        return HairStep.SEARCH
    return None


def hair_search_due(session: Session, answer: str) -> bool:
    """The visitor described their hair in answer to the question, and nothing was searched for
    it yet: the search is forced. Any other answer leaves the choice to the model."""
    return (
        hair_step(session) is HairStep.SEARCH
        and session.flags.get(LAST_SEARCH_TURN) != session.turn_index
        and DESCRIBED.search(answer) is not None
        and DECLINED.search(answer) is None
    )


def asks_about_hair(reply: str) -> bool:
    """One of the reply's questions is about the visitor's hair."""
    return any(HAIR.search(s) for s in SENTENCE_END.split(reply) if s.rstrip().endswith("?"))


def with_hair_question(session: Session, reply: str) -> str:
    """The reply as said, if this turn already asks about hair; otherwise its statements, with the
    fixed hair question in place of any question of its own (saving the profile comes later)."""
    if asks_about_hair(reply) or asks_about_hair(_said_this_turn(session)):
        return reply
    statements = [s for s in SENTENCE_END.split(reply.strip()) if s and not s.endswith("?")]
    return " ".join([*statements, QUESTION[session.language]])


def hair_pick(session: Session) -> tuple[str, str] | None:
    """The top pick of the latest search, when it is haircare, and its first approved claim, as
    the tool returned them to the model."""
    found = next(
        (
            m["content"]
            for m in reversed(session.history)
            if m["role"] == "tool" and m.get("name") == "search_products"
        ),
        None,
    )
    try:
        first = json.loads(found)["top_pick"] if found else None
    except ValueError, KeyError, TypeError:
        return None
    if not first or first.get("category") != Category.HAIRCARE or not first.get("claims"):
        return None
    return first["name"], first["claims"][0]["text"]


def _last_user_index(session: Session) -> int:
    users = [i for i, message in enumerate(session.history) if message["role"] == "user"]
    return users[-1] if users else len(session.history)


def _previous_reply(session: Session) -> str:
    """What the expert said last, before the visitor's latest line."""
    earlier = session.history[: _last_user_index(session)]
    return next(
        (m["content"] for m in reversed(earlier) if m["role"] == "assistant" and m.get("content")),
        "",
    )


def _said_this_turn(session: Session) -> str:
    """What the expert has said since the visitor's latest line."""
    later = session.history[_last_user_index(session) + 1 :]
    return " ".join(m.get("content") or "" for m in later if m["role"] == "assistant")
