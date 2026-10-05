"""Tests for send_recap with a fake writer (spec 006): consent first, a valid address, both
events with the address masked, and the template when the writer fails, is too slow or writes
something the check rejects."""

import asyncio
import json
from pathlib import Path

import pytest

from app.catalogue.store import Catalogue
from app.conversation.agent import Tool
from app.conversation.session import Session
from app.profile.models import Consent
from app.recap.coupon import coupon_code
from app.recap.facts import RecapFacts
from app.recap.writer import Recap, Writer, Written
from app.tools.recap_tools import SAY_READY, SendRecapArgs, recap_tool
from app.usage.meter import TokenUsage

CATALOGUE = Catalogue.load(Path(__file__).parents[1] / "fixtures" / "catalogue_fixture.json")
SAID = SendRecapArgs(email="camille dot martin at example dot com")
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


def _session(consent: Consent = Consent.GIVEN, read_back: bool = True) -> Session:
    """With `read_back`, the address was read back to the visitor in the previous turn."""
    session = Session(id="session-1", active_agent="skincare", language="en")
    if read_back:
        session.flags["pending_email"] = "camille.martin@example.com"
        session.flags["pending_email_turn"] = 0
        session.turn_index = 1
    session.profile.consent = consent
    session.profile.first_name = "Camille"
    for product_id in ("fx-rich-dry", "fx-cleanser"):
        session.basket.add(CATALOGUE.get(product_id), "en")
    session.flags["shown_tutorials"] = [TUTORIAL]
    return session


def _tool(writer: Writer, budget_s: float = 6.0) -> Tool:
    return recap_tool(None, MODEL, catalogue=CATALOGUE, writer=writer, budget_s=budget_s)


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
        (Consent.PENDING, SAID.email, "consent_needed"),
        (Consent.DECLINED, SAID.email, "consent_needed"),
        (Consent.GIVEN, "camille at example", "invalid_email"),
    ],
)
async def test_send_recap_needs_consent_and_a_valid_address(
    consent: Consent, email: str, reason: str
):
    session = _session(consent)

    result = await _tool(_never_called).handler(session, SendRecapArgs(email=email))

    content = json.loads(result.content)
    assert (content["sent"], content["reason"], bool(content["next"])) == (False, reason, True)
    assert result.ui_events == []
    assert session.profile.email is None


async def test_send_recap_masks_the_address_and_shows_the_recap():
    seen: list[RecapFacts] = []

    async def write(facts: RecapFacts) -> Written:
        seen.append(facts)
        recap = Recap(subject="Your routine, Camille", body=_keeps_the_rules(facts))
        return Written(recap=recap, usage=TokenUsage(400, 150))

    session = _session()

    result = await _tool(write).handler(session, SAID)

    code = coupon_code("session-1")
    assert json.loads(result.content) == {
        "recap_on_screen": True,
        "next": SAY_READY,
        "coupon_code": code,
    }
    assert [event.type for event in result.ui_events] == ["profile.updated", "recap.ready"]
    profile, recap = (event.payload for event in result.ui_events)
    assert profile["profile"]["email"] == session.profile.email == "c***@example.com"
    assert (recap["email_masked"], recap["subject"], recap["body"]) == (
        "c***@example.com",
        "Your routine, Camille",
        _keeps_the_rules(seen[0]),
    )
    assert recap["coupon"]["code"] == code and set(recap["coupon"]) >= {"label", "valid_until"}
    assert "martin" not in result.content + json.dumps([profile, recap])
    facts = seen[0]
    assert [p.name for p in facts.products] == ["Fixture Rich Cream", "Fixture Gel Cleanser"]
    assert facts.products[0].claim == "Fixture claim: hydrates fixture skin for 24 hours."
    assert [(t.creator, t.platform) for t in facts.tutorials] == [("Fixture Creator", "TikTok")]
    assert session.usage.tokens[MODEL] == TokenUsage(400, 150)


@pytest.mark.parametrize("writer", [_failing, _slow, _paraphrasing])
async def test_send_recap_uses_the_template_when_the_writer_fails_lags_or_breaks_a_rule(
    writer: Writer,
):
    session = _session()

    result = await _tool(writer, budget_s=0.05).handler(session, SAID)

    recap = result.ui_events[1].payload
    assert recap["subject"] == "Your L'Oréal routine, Camille"
    assert recap["body"].startswith("Hello Camille,")
    assert "Fixture Brand A Fixture Rich Cream" in recap["body"]
    assert "“Fixture claim: hydrates fixture skin for 24 hours.”" in recap["body"]
    assert "Fixture Creator on TikTok" in recap["body"]
    offer = recap["body"].split("\n\n")[-1]
    code = coupon_code("session-1")
    assert offer.startswith(f"Example offer: 10% off this routine in store. Your code: {code}")
    assert MODEL not in session.usage.tokens


def test_send_recap_shows_the_address_masked_in_its_public_arguments() -> None:
    tool = recap_tool(None, "model")
    assert tool.public_args is not None
    shown = tool.public_args({"email": "camille.martin@example.com"})
    assert shown == {"email": "c***@example.com"}
    assert tool.public_args({"email": "camille dot martin at example dot com"}) == shown


async def test_send_recap_reads_the_address_back_before_writing_anything():
    session = _session(read_back=False)
    tool = _tool(_never_called)

    first = await tool.handler(session, SAID)
    again = await tool.handler(session, SAID)  # a second call in the same turn

    for result in (first, again):
        content = json.loads(result.content)
        assert content["status"] == "confirm_first"
        assert content["read_back"] == "camille dot martin at example dot com"
        assert result.ui_events == []
    assert session.profile.email is None
