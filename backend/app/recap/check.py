"""Checks a model-written recap body against its facts (spec 006). Any problem sends the tool to
the template: quotation marks hold approved claims only, word for word; every fit sentence is
there as written; the body ends with the offer and its code; the body stays short. A benefit
written without quotation marks escapes these checks: the golden tests' claims judge reads for
those.
"""

import re

from app.recap.facts import RecapFacts

BODY_LIMIT_WORDS = 140  # the prompt asks for 120; a little over still fits the preview
QUOTED = re.compile(r"\"([^\"]+)\"|“([^”]+)”|«([^»]+)»")


def problems(body: str, facts: RecapFacts) -> list[str]:
    """What breaks the rules, one line each; empty when the body is fine."""
    found: list[str] = []
    lines = body.strip().splitlines() or [""]
    if facts.coupon.code not in lines[-1]:
        found.append("the body does not end with the offer and its code")
    plain_body = _plain(body)
    for product in facts.products:
        if product.fit and _plain(product.fit) not in plain_body:
            found.append(f"the fit sentence of {product.name} is not there as written")
    claims = {_plain(product.claim) for product in facts.products if product.claim}
    for quote in _quotes(body):
        if _plain(quote) not in claims:
            found.append(f"a quotation is not an approved claim: {quote[:60]}")
    words = len(body.split())
    if words > BODY_LIMIT_WORDS:
        found.append(f"the body has {words} words")
    return found


def _quotes(text: str) -> list[str]:
    return [next(group for group in match.groups() if group) for match in QUOTED.finditer(text)]


def _plain(text: str) -> str:
    """Compared without case, spacing, curly apostrophes or the final full stop."""
    return " ".join(text.replace("’", "'").split()).strip(" .!?").casefold()
