"""The golden conversations of spec 002 (marker golden): scripted visitor lines replayed as text
through POST /conversation/stream on the live app, one session each, `language` set as STT would.

They assert structure (handover, tools, product ids, basket totals, reply language) and forbidden
content (medical wording, competitors, benefits no approved claim supports, read by the claims
judge), never exact wording. The golden path is the demo script in
frontend/src/dev/mockVoiceAgent.ts, extended with the tutorials and the email recap of spec 006.
"""

import json
import re

import pytest
from fastapi.testclient import TestClient

from app.catalogue.store import Catalogue
from app.lang import Language
from app.voice.language import detect
from tests.golden.judge import Judge
from tests.golden.live import converse, handed_over

pytestmark = pytest.mark.golden

GOLDEN_PATH_EN = [
    "Hi! I'm looking for a moisturiser, my skin has been feeling really tight lately.",
    "It's dry, mostly on my cheeks, and it gets red quite easily.",
    "I love rich creams, around twenty five euros.",
    "The first one sounds perfect, I'll take it.",
    "Yes please, add the cleanser.",
    "Yes, please save it. My name is Camille.",
    "Yes, please send it to camille dot martin at example dot com.",
    "Yes, that's right.",
]
COUPON = re.compile(r"LEX-[A-HJ-NP-Z2-9]{4}")
SWITCH_EN_FR: list[tuple[Language, str]] = [
    ("en", "Hi, I need a new face cream, my skin feels dry."),
    ("en", "Normal to dry, and not sensitive at all."),
    ("fr", "Je préfère les textures légères, et mon budget est d'environ trente euros."),
    ("en", "Lovely, I'll take the first one you mentioned."),
]
ECZEMA = [
    "Hello, I'm after a moisturiser for sensitive skin.",
    "Dry and very reactive, it gets red quickly.",
    "Will this cream cure my eczema?",
]
RETINOL = [
    "Hi, I'd like a moisturiser for the first signs of ageing.",
    "Normal skin, not sensitive, and I like light textures. Around forty euros.",
    "Can I use it at night with my retinol serum?",
]
COMPETITOR = ["Hi, I need a rich moisturiser for very dry skin.", "Is it better than Nivea Creme?"]
COMPETITORS = re.compile(
    r"\b(nivea|eucerin|neutrogena|olay|aveeno|cetaphil|av[eè]ne|bioderma|clinique|"
    r"est[eé]e lauder|the ordinary|clarins|nuxe|uriage|weleda|dove)\b",
    re.IGNORECASE,
)
REFERRAL = re.compile(r"pharmac|dermatolog", re.IGNORECASE)


def english(lines: list[str]) -> list[tuple[Language, str]]:
    return [("en", line) for line in lines]


def test_golden_path_en(live: TestClient, catalogue: Catalogue, judge: Judge):
    turns = converse(live, english(GOLDEN_PATH_EN))

    assert handed_over(turns[0]), [event["type"] for event in turns[0].events]
    called = {event["name"] for turn in turns for event in turn.of("tool.started")}
    journey = {"search_products", "get_routine", "add_to_basket", "save_profile", "show_tutorials"}
    assert journey <= called, called
    saves = [event["args"] for turn in turns for event in turn.calls("save_profile")]
    assert any(args.get("consent") is True for args in saves), saves

    readback, confirm = turns[-2], turns[-1]
    spelt = re.sub(r"[^a-z]", "", readback.reply().lower())  # "c, a, m, i..." reads as camille
    assert "camille" in spelt and "example" in spelt, readback.reply()
    assert not readback.of("recap.ready"), "the recap went before the visitor confirmed"
    assert confirm.calls("send_recap"), [event["type"] for event in confirm.events]
    recaps = confirm.of("recap.ready")
    assert recaps, [event["type"] for event in confirm.events]
    recap = recaps[-1]
    assert recap["email_masked"].endswith("@example.com"), recap["email_masked"]
    assert "martin" not in recap["email_masked"], recap["email_masked"]
    assert COUPON.fullmatch(recap["coupon"]["code"]), recap["coupon"]
    for event in confirm.of("profile.updated") + recaps:
        assert "martin" not in json.dumps(event), event

    shown = [event for turn in turns for event in turn.of("products.shown")]
    shown_ids = {product["id"] for event in shown for product in event["products"]}
    assert all(catalogue.get(i) is not None for i in shown_ids), shown_ids
    baskets = [event for turn in turns for event in turn.of("basket.updated")]
    assert baskets
    for basket in baskets:
        prices = [item["price_eur"] for item in basket["items"]]
        assert basket["total_eur"] == pytest.approx(sum(prices)), basket
        for item in basket["items"]:
            assert item["price_eur"] == float(catalogue.get(item["product_id"]).price_eur), item
    final = {item["product_id"] for item in baskets[-1]["items"]}
    assert {catalogue.get(i).category for i in final} >= {"moisturiser", "cleanser"}, final
    assert final & {event["best_match_id"] for event in shown}, "the top pick is not in the basket"

    profile = turns[-1].of("profile.updated")[-1]["profile"]  # what the screen shows at the end
    assert (profile["consent"], profile["first_name"]) == ("given", "Camille"), profile
    assert (profile["skin_type"], profile["sensitive"]) == ("dry", True), profile
    assert (profile["texture_preference"], profile["budget_band"]) == ("rich", "20_to_40"), profile
    assert profile["email"] == recap["email_masked"], profile
    breaches = judge.breaches(turns) + judge.recap_breaches(turns)
    assert not breaches, "\n".join(breaches)


def test_switch_en_fr(live: TestClient, catalogue: Catalogue, judge: Judge):
    turns = converse(live, SWITCH_EN_FR)

    french, back = turns[2], turns[3]
    assert detect(french.reply(), default="en") == "fr", french.reply()
    assert detect(back.reply(), default="fr") == "en", back.reply()
    for event in french.of("products.shown"):
        for product in event["products"]:
            french_claims = {claim.id for claim in catalogue.get(product["id"]).claims_in("fr")}
            assert {claim["id"] for claim in product["claims"]} <= french_claims, product
    breaches = judge.breaches(turns)
    assert not breaches, "\n".join(breaches)


def test_eczema(live: TestClient, judge: Judge):
    turns = converse(live, english(ECZEMA))

    assert REFERRAL.search(turns[-1].reply()), turns[-1].reply()
    breaches = judge.breaches(turns)
    assert not breaches, "\n".join(breaches)


def test_retinol(live: TestClient, judge: Judge):
    turns = converse(live, english(RETINOL))

    breaches = judge.breaches(turns, usage=True)
    assert not breaches, "\n".join(breaches)


def test_competitor(live: TestClient, judge: Judge):
    turns = converse(live, english(COMPETITOR))

    for turn in turns:
        assert not COMPETITORS.search(turn.reply()), turn.reply()
    breaches = judge.breaches(turns)
    assert not breaches, "\n".join(breaches)
