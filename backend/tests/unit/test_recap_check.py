"""Tests for the checks on a model-written recap body (spec 006): what sends it to the template."""

from datetime import date

import pytest

from app.recap.check import problems
from app.recap.coupon import make_coupon
from app.recap.facts import ProductFacts, RecapFacts

CLAIM = "Gently removes dirt, oil and makeup without leaving skin tight or dry"
FIT = "For dry, sensitive skin: within your budget."
FACTS = RecapFacts(
    first_name="Camille",
    language="en",
    skin="dry, sensitive skin",
    preferences=[],
    products=[
        ProductFacts(
            brand="CeraVe",
            name="Hydrating Cleanser",
            routine_step="Cleanser",
            fit=FIT,
            claim=CLAIM,
            usage_note=None,
        )
    ],
    tutorials=[],
    coupon=make_coupon("session-1", "en", date(2026, 10, 7)),
)
OFFER = f"Example offer: 10% off this routine in store. Your code: {FACTS.coupon.code}."
GOOD = f"Hi Camille,\n\nCeraVe Hydrating Cleanser\n{FIT}\n“{CLAIM}.”\n\n{OFFER}"


def test_a_body_that_keeps_the_rules_has_no_problem():
    assert problems(GOOD, FACTS) == []
    assert problems(GOOD.replace("“", '"').replace("”", '"'), FACTS) == []


@pytest.mark.parametrize(
    ("body", "problem"),
    [
        (GOOD.replace(CLAIM, "Cleanses and hydrates gently"), "a quotation is not an approved"),
        (GOOD.replace(FIT, "Perfect for you."), "the fit sentence of Hydrating Cleanser"),
        (f"{OFFER}\n\nHi Camille, see the tutorials.", "the body does not end with the offer"),
        (GOOD.replace("Hi Camille,", "Hi Camille, " + "lovely " * 140), "the body has"),
    ],
)
def test_a_body_that_breaks_a_rule_is_reported(body: str, problem: str):
    assert any(found.startswith(problem) for found in problems(body, FACTS)), problems(body, FACTS)
