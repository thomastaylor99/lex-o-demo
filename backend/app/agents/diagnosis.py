"""The skincare diagnosis (spec 002): the same questions, in the same order, before any product.

Thomas, 2026-10-05: skin type, redness, the product they use now (feedback for the brands'
marketing teams), texture, then age range (optional), skipping what the visitor already said.
Thomas, 2026-10-06: first, which product they are looking for, when neither their words nor the
concierge's summary named one; after redness, what they would most like to improve, so the record
holds their concerns; and a texture counts as answered only with a direction ("too thick" means
light), so the record holds it too.
The code picks each turn's topic and holds the search until the diagnosis is complete; the
model only words the question. A topic is answered once the visitor's words mention it, once the
profile holds it, or once the expert asked about it and the visitor replied with anything but a
question. After a second ask, any reply moves on.
"""

import re
from dataclasses import dataclass, field
from enum import StrEnum

from app.catalogue.models import TexturePreference
from app.conversation.session import Session
from app.profile.models import BeautyProfile


class Topic(StrEnum):
    PRODUCT = "product"
    SKIN_TYPE = "skin_type"
    REDNESS = "redness"
    CONCERN = "concern"
    CURRENT_PRODUCT = "current_product"
    TEXTURE = "texture"
    AGE = "age"


# The current product comes before texture: "it was too heavy" answers both.
ORDER = (
    Topic.PRODUCT,
    Topic.SKIN_TYPE,
    Topic.REDNESS,
    Topic.CONCERN,
    Topic.CURRENT_PRODUCT,
    Topic.TEXTURE,
    Topic.AGE,
)

# What the expert asks about, as the context section names it.
QUESTIONS: dict[Topic, str] = {
    Topic.PRODUCT: "which product they are looking for: a moisturiser, a cleanser, a serum or a "
    "sunscreen",
    Topic.SKIN_TYPE: "how their skin usually feels: dry, oily, combination or normal",
    Topic.REDNESS: "whether their skin reddens, stings or reacts when they apply a cream",
    Topic.CONCERN: "what they would most like to improve for their skin, such as hydration, "
    "blemishes or the first signs of ageing",
    Topic.CURRENT_PRODUCT: "which moisturiser they use at the moment and how they find it",
    Topic.TEXTURE: "whether they prefer a light or a rich texture",
    Topic.AGE: "their age range, saying it is optional and that a decade is enough",
}

# Words that show the visitor has spoken to a topic, in English and French. A word missed here
# costs one redundant question; a word wrongly matched skips one, so ambiguous words stay out
# ("sec" as in "one sec", "brilliant", "tight budget").
MENTIONS: dict[Topic, re.Pattern[str]] = {
    # A type of product. "Skincare", "routine" and "products" name none.
    Topic.PRODUCT: re.compile(
        r"\b(moisturi[sz]\w*|creams?|serums?|cleans\w*|face ?wash|sunscreens?|sun ?creams?|spf|"
        r"sun protection|toners?|lotions?|shampoos?|conditioners?|hair ?(?:care|oils?|masks?)|"
        r"crèmes?|hydratante?s?|sérums?|nettoyants?|démaquillants?|écrans?|solaires?|"
        r"shampo{1,2}ings?|huiles?|masques?)\b",
        re.IGNORECASE,
    ),
    Topic.SKIN_TYPE: re.compile(
        r"\b(dry|drier|oily|greasy|combination|combo|normal|tight(?:ness)?(?!\s+budget)|shiny|"
        r"flaky|dehydrated|sèches?|grasses?|gras|mixte|normale|tiraill\w*|brill(?:e|ance|ante?s?)|"
        r"déshydratée?)\b",
        re.IGNORECASE,
    ),
    Topic.REDNESS: re.compile(
        r"\b(red|redden\w*|redness|reddish|react\w*|sensitiv\w*|sting\w*|itch\w*|burn\w*|"
        r"irritat\w*|tingl\w*|flush\w*|allerg\w*|rouge\w*|rougi\w*|réacti\w*|réagi\w*|"
        r"sensibles?|sensibilité|picot\w*|irrit\w*|démang\w*|brûl\w*|échauff\w*)\b",
        re.IGNORECASE,
    ),
    # Concerns beyond redness, which has its own topic. "Hydratante" names the product in French.
    Topic.CONCERN: re.compile(
        r"\b(hydrat(?:ion|ed|ing|e)|dehydrat\w*|moisture|radian\w*|glow\w*|dull\w*|"
        r"blemish\w*|spots?|pimples?|breakouts?|imperfections?|lines|wrinkl\w*|age?ing|"
        r"anti-?age|firm\w*|sagging|hydratation|éclat|terne|boutons?|ridules?|rides|fermeté|"
        r"vieilliss\w*|anti-?âge)\b",
        re.IGNORECASE,
    ),
    # Only words with a direction: "the texture is nice" says nothing the record can hold.
    Topic.TEXTURE: re.compile(
        r"\b(rich|richer|light|lighter|lightweight|thick|thicker|heavy|creamy|gel|fluid|lotion|"
        r"balm|riches?|légers?|légères?|épais|épaisses?|onctueu\w*|crémeuses?|fluides?|"
        r"baumes?)\b",
        re.IGNORECASE,
    ),
    Topic.CURRENT_PRODUCT: re.compile(
        r"\b((?<!do )i (?:usually |currently |always )?(?:use|used|tried)|"
        r"i(?:['’]m| am) (?:currently )?using|i(?:['’]ve| have) (?:been using|used|tried)|"
        r"my (?:current|usual)|j['’]utilis\w*|j['’]ai (?:utilisé|essayé)|"
        r"ma crème (?:actuelle|habituelle))",
        re.IGNORECASE,
    ),
    Topic.AGE: re.compile(
        r"\b(\d{2} ?(?:years?|yrs|ans)\b|i(?:['’]m| am) (?:\d{2}|twenty|thirty|forty|fifty|sixty|"
        r"seventy)(?![\w-]* ?(?:euros?|€|pounds|%))|j['’]ai [\w-]+ ans|"
        r"(?:twenties|thirties|forties|fifties|sixties|seventies)|"
        r"(?:vingtaine|trentaine|quarantaine|cinquantaine|soixantaine))",
        re.IGNORECASE,
    ),
}

# Words a question about each topic uses, in English and French: a reply without them asks
# about something else.
ASKS: dict[Topic, re.Pattern[str]] = {
    Topic.PRODUCT: re.compile(
        r"product|looking for|moisturi|cleanser|serum|sunscreen|cream|produit|recherch|cherch|"
        r"crème|hydratant|nettoyant|sérum|solaire",
        re.IGNORECASE,
    ),
    Topic.SKIN_TYPE: re.compile(
        r"dry|oily|combination|normal|skin type|skin (?:usually |normally |generally )?feel|"
        r"sèche|grasse|mixte|normale|type de peau",
        re.IGNORECASE,
    ),
    Topic.REDNESS: re.compile(
        r"red|react|sensitiv|sting|itch|burn|irritat|tingl|rougi|rouge|réagi|réacti|sensible|"
        r"picot|démang|brûl",
        re.IGNORECASE,
    ),
    Topic.CONCERN: re.compile(
        r"improve|help|work on|concern|focus|hydrat|radian|glow|blemish|ageing|aging|lines|"
        r"wrinkl|firm|amélior|aider|préoccup|hydratation|éclat|imperfection|âge|rides|fermeté",
        re.IGNORECASE,
    ),
    Topic.CURRENT_PRODUCT: re.compile(
        r"\buse|using|current|at the moment|right now|routine|utilis|en ce moment|actuel",
        re.IGNORECASE,
    ),
    Topic.TEXTURE: re.compile(
        r"rich|light|texture|thick|gel|riche|légère|léger|épaisse", re.IGNORECASE
    ),
    Topic.AGE: re.compile(r"\bage\b|\bold\b|decade|years|\bâge\b|\bans\b|décennie", re.IGNORECASE),
}

# The texture a complaint about the current cream implies, which the next question says back
# (Thomas, 2026-10-06: "too thick" was heard as an answer, and the record stayed empty).
TOO_HEAVY = re.compile(
    r"\btoo (?:thick|heavy|rich|greasy|creamy|oily)|\btrop (?:épaisse?|lourde?|riche|grasse?)",
    re.IGNORECASE,
)
TOO_LIGHT = re.compile(
    r"\btoo (?:light|thin|runny)|\bnot (?:rich|nourishing|moisturi\w+) enough|"
    r"\btrop (?:légère?|fluide)|\bpas assez (?:riche|nourrissante?|hydratante?)",
    re.IGNORECASE,
)

FLAG = "diagnosis"


def implied_texture(text: str) -> TexturePreference | None:
    """Light when the visitor finds their cream too heavy, rich when they find it too light."""
    heavy, light = TOO_HEAVY.search(text) is not None, TOO_LIGHT.search(text) is not None
    if heavy == light:
        return None
    return TexturePreference.LIGHT if heavy else TexturePreference.RICH


def mentioned(text: str) -> set[Topic]:
    """The topics these words speak to."""
    return {topic for topic, pattern in MENTIONS.items() if pattern.search(text)}


def known(profile: BeautyProfile) -> set[Topic]:
    """The topics the profile already holds, from the extractor's earlier turns. The concern is
    left out: the extractor read "quite dry" as a hydration concern in a golden run and the
    question never came, so only the visitor's words or the question answer it."""
    held = {
        Topic.SKIN_TYPE: profile.skin_type is not None,
        Topic.REDNESS: profile.sensitive is not None,
        Topic.CURRENT_PRODUCT: bool(profile.product_feedback),
        Topic.TEXTURE: profile.texture_preference is not None,
        Topic.AGE: profile.age_range is not None,
    }
    return {topic for topic, is_held in held.items() if is_held}


@dataclass
class Diagnosis:
    answered: set[Topic] = field(default_factory=set)
    asks: dict[Topic, int] = field(default_factory=dict)
    asking: Topic | None = None  # what this turn asks about
    turn: int = -1  # the turn `asking` belongs to
    heard: int = 0  # visitor lines already read

    def advance(
        self, turn: int, lines: list[str], profile: BeautyProfile, summary: str = ""
    ) -> None:
        """Read the visitor's new lines and pick this turn's topic; a no-op within a turn. The
        concierge's summary can name the product, in the visitor's terms, and nothing else."""
        if turn == self.turn:
            return
        self.turn = turn
        new = lines[self.heard :]
        self.heard = len(lines)
        for line in new:
            self.answered |= mentioned(line)
        self.answered |= known(profile) | (mentioned(summary) & {Topic.PRODUCT})
        latest = new[-1] if new else ""
        if self.asking is not None and self.asking not in self.answered:
            if "?" not in latest or self.asks.get(self.asking, 0) >= 2:
                self.answered.add(self.asking)
        self.asking = self.next_topic()
        if self.asking is not None:
            self.asks[self.asking] = self.asks.get(self.asking, 0) + 1

    def next_topic(self) -> Topic | None:
        return next((topic for topic in ORDER if topic not in self.answered), None)

    @property
    def complete(self) -> bool:
        return self.next_topic() is None

    @property
    def asked_again(self) -> bool:
        """This turn asks the same topic a second time: the visitor answered with a question."""
        return self.asking is not None and self.asks.get(self.asking, 0) > 1


def diagnosis_for(session: Session) -> Diagnosis:
    """The session's diagnosis, brought up to date with the current turn."""
    diagnosis: Diagnosis = session.flags.setdefault(FLAG, Diagnosis())
    lines = [message["content"] for message in session.history if message["role"] == "user"]
    summary = session.flags.get("handover_summary") or ""
    diagnosis.advance(session.turn_index, lines, session.profile, summary)
    return diagnosis
