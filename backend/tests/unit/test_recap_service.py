"""Tests for the recap service with a fake writer (spec 006): consent first, a valid typed
address, the address masked in the profile and the result, the flag the expert's context reads,
and the template when there is no writer, or when it fails, is too slow or breaks a rule."""

import asyncio
from pathlib import Path

import pytest

from app.catalogue.store import Catalogue
from app.conversation.session import Session
from app.profile.models import Consent
from app.recap.coupon import coupon_code
from app.recap.facts import RecapFacts
from app.recap.service import RECAP_FLAG, RecapRefused, RecapService, Refusal
from app.recap.writer import Recap, Writer, Written
from app.usage.meter import TokenUsage

CATALOGUE = Catalogue.load(Path(__file__).parents[1] / "fixtures" / "catalogue_fixture.json")
TYPED = " Camille.Martin@example.com "
MODEL = "recap-model"
TUTORIAL = {
    "id": "tut-1",
    "product_ids": ["fx-rich-dry"],
    "brand": "Fixture Brand A",
    "platform": "tiktok",
    "creator": "Fixture Creator",
    "creator_kind": "creator",
    "title": "Fixture routine",
    "url": "https://example.com/tut-1",
    "language": "en",
}


def _session(consent: Consent = Consent.GIVEN) -> Session:
    session = Session(id="session-1", active_agent="skincare", language="en")
    session.profile.consent = consent
    session.profile.first_name = "Camille"
    for product_id in ("fx-rich-dry", "fx-cleanser"):
        session.basket.add(CATALOGUE.get(product_id), "en")
    session.flags["shown_tutorials"] = [TUTORIAL]
    return session


def _service(writer: Writer | None, budget_s: float = 6.0) -> RecapService:
    return RecapService(CATALOGUE, MODEL, writer, budget_s)


def _keeps_the_rules(facts: RecapFacts) -> str:
    """A body the check accepts: each product with its fit sentence, then the offer's code."""
    products = [f"{p.brand} {p.name}. {p.fit or ''}".strip() for p in facts.products]
    return "\n\n".join(["Hello Camille,", *products, f"Your code: {facts.coupon.code}"])


async def _never_called(facts: RecapFacts) -> Written:
    raise AssertionError("the writer must not run")


async def _failing(facts: RecapFacts) -> Written:
    raise RuntimeError("the model is down")


async def _slow(facts: RecapFacts) -> Written:
    await asyncio.sleep(1)
    raise AssertionError("the budget should have cut this call")


async def _paraphrasing(facts: RecapFacts) -> Written:
    body = _keeps_the_rules(facts).replace("Camille,", 'Camille, "Hydrates for 48 hours."')
    return Written(recap=Recap(subject="Your routine", body=body))


@pytest.mark.parametrize(
    ("consent", "email", "reason"),
    [
        (Consent.PENDING, TYPED, Refusal.CONSENT_NEEDED),
        (Consent.DECLINED, TYPED, Refusal.CONSENT_NEEDED),
        (Consent.GIVEN, "camille at example", Refusal.INVALID_EMAIL),
        (Consent.GIVEN, "camille.martin@", Refusal.INVALID_EMAIL),
    ],
)
async def test_the_recap_needs_consent_and_a_valid_address(
    consent: Consent, email: str, reason: Refusal
):
    session = _session(consent)

    with pytest.raises(RecapRefused) as refused:
        await _service(_never_called).prepare(session, email)

    assert refused.value.reason is reason
    assert session.profile.email is None
    assert RECAP_FLAG not in session.flags


async def test_the_recap_masks_the_typed_address_and_flags_the_screen():
    seen: list[RecapFacts] = []

    async def write(facts: RecapFacts) -> Written:
        seen.append(facts)
        recap = Recap(subject="Your routine, Camille", body=_keeps_the_rules(facts))
        return Written(recap=recap, usage=TokenUsage(400, 150))

    session = _session()

    prepared = await _service(write).prepare(session, TYPED)

    assert prepared.email_masked == "c***@example.com"
    assert session.profile.email == session.flags[RECAP_FLAG] == "c***@example.com"
    assert (prepared.recap.subject, prepared.recap.body) == (
        "Your routine, Camille",
        _keeps_the_rules(seen[0]),
    )
    code = coupon_code("session-1")
    assert prepared.coupon["code"] == code and set(prepared.coupon) >= {"label", "valid_until"}
    assert "martin" not in repr(prepared).lower()
    facts = seen[0]
    assert [p.name for p in facts.products] == ["Fixture Rich Cream", "Fixture Gel Cleanser"]
    assert facts.products[0].claim == "Fixture claim: hydrates fixture skin for 24 hours."
    assert [(t.creator, t.platform) for t in facts.tutorials] == [("Fixture Creator", "TikTok")]
    assert session.usage.tokens[MODEL] == TokenUsage(400, 150)


@pytest.mark.parametrize("writer", [None, _failing, _slow, _paraphrasing])
async def test_the_template_writes_the_recap_without_a_writer_or_when_it_fails_lags_or_strays(
    writer: Writer | None,
):
    session = _session()

    prepared = await _service(writer, budget_s=0.05).prepare(session, TYPED)

    recap = prepared.recap
    assert recap.subject == "Your L'Oréal routine, Camille"
    assert recap.body.startswith("Hello Camille,")
    assert "Fixture Brand A Fixture Rich Cream" in recap.body
    assert "“Fixture claim: hydrates fixture skin for 24 hours.”" in recap.body
    assert "Fixture Creator on TikTok" in recap.body
    offer = recap.body.split("\n\n")[-1]
    code = coupon_code("session-1")
    assert offer.startswith(f"Example offer: 10% off this routine in store. Your code: {code}")
    assert MODEL not in session.usage.tokens
