"""The recap from a template (spec 006): the fallback when the model is slow or fails.

Deterministic and built from the facts only: the greeting, the skin, each product with its fit
sentence and its approved claim, the tutorials by creator and platform, then the in-store offer
and its code. Claims drop out from the last product first until the body fits in 120 words;
the first product, the top pick, always keeps its claim.
"""

from app.lang import Language
from app.recap.facts import ProductFacts, RecapFacts, TutorialFacts
from app.recap.words import long_date
from app.recap.writer import BODY_MAX_WORDS, Recap, clip_subject

TEXT: dict[Language, dict[str, str]] = {
    "en": {
        "subject": "Your L'Oréal routine, {name}",
        "subject_anonymous": "Your L'Oréal routine",
        "hello": "Hello {name},",
        "hello_anonymous": "Hello,",
        "intro": "Here is the routine we chose together for your {skin}.",
        "intro_plain": "Here is the routine we chose together.",
        "product": "{step}: {brand} {name}.",
        "claim": "“{claim}”",
        "tutorials": "Tutorials to follow: {items}.",
        "tutorial": "{creator} on {platforms}",
        "and": " and ",
        "offer": "{label}. Your code: {code}, valid until {date}.",
    },
    "fr": {
        "subject": "Votre routine L'Oréal, {name}",
        "subject_anonymous": "Votre routine L'Oréal",
        "hello": "Bonjour {name},",
        "hello_anonymous": "Bonjour,",
        "intro": "Voici la routine choisie ensemble pour votre {skin}.",
        "intro_plain": "Voici la routine choisie ensemble.",
        "product": "{step} : {brand} {name}.",
        "claim": "« {claim} »",
        "tutorials": "Tutoriels à suivre : {items}.",
        "tutorial": "{creator} sur {platforms}",
        "and": " et ",
        "offer": "{label}. Votre code : {code}, valable jusqu'au {date}.",
    },
}


def template_recap(facts: RecapFacts) -> Recap:
    text = TEXT[facts.language]
    name = facts.first_name
    subject = text["subject"].format(name=name) if name else text["subject_anonymous"]
    claims = len(facts.products)
    body = _body(facts, text, claims)
    while claims > 1 and len(body.split()) > BODY_MAX_WORDS:
        claims -= 1
        body = _body(facts, text, claims)
    return Recap(subject=clip_subject(subject), body=body)


def _body(facts: RecapFacts, text: dict[str, str], claims: int) -> str:
    """Short paragraphs, quoting the approved claims of the first `claims` products."""
    name, coupon = facts.first_name, facts.coupon
    paragraphs = [
        text["hello"].format(name=name) if name else text["hello_anonymous"],
        text["intro"].format(skin=facts.skin) if facts.skin else text["intro_plain"],
        *(_product(p, text, with_claim=i < claims) for i, p in enumerate(facts.products)),
    ]
    if facts.tutorials:
        paragraphs.append(_tutorials(facts.tutorials, text))
    valid_until = long_date(coupon.valid_until, facts.language)
    paragraphs.append(text["offer"].format(label=coupon.label, code=coupon.code, date=valid_until))
    return "\n\n".join(paragraphs)


def _product(product: ProductFacts, text: dict[str, str], with_claim: bool) -> str:
    head = text["product"].format(step=product.routine_step, brand=product.brand, name=product.name)
    claim = text["claim"].format(claim=product.claim) if with_claim and product.claim else None
    return " ".join(part for part in (head, _sentence(product.fit), claim) if part)


def _tutorials(tutorials: list[TutorialFacts], text: dict[str, str]) -> str:
    """Grouped by creator: La Roche-Posay on TikTok and YouTube, then the next creator."""
    platforms: dict[str, list[str]] = {}
    for tutorial in tutorials:
        listed = platforms.setdefault(tutorial.creator, [])
        if tutorial.platform not in listed:
            listed.append(tutorial.platform)
    items = [
        text["tutorial"].format(creator=creator, platforms=_join(names, text["and"]))
        for creator, names in platforms.items()
    ]
    return text["tutorials"].format(items=", ".join(items))


def _join(items: list[str], conjunction: str) -> str:
    return items[0] if len(items) == 1 else ", ".join(items[:-1]) + conjunction + items[-1]


def _sentence(text: str | None) -> str | None:
    """The fit sentence with its full stop, or None."""
    if not text or not text.strip():
        return None
    text = text.strip()
    return text if text.endswith((".", "!", "?")) else f"{text}."
