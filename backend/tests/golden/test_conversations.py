"""The golden conversations of spec 002 (marker golden): scripted visitor lines replayed as text
through POST /conversation/stream on the live app, one session each, `language` set as STT would.

They assert structure (handover, tools, product ids, basket totals, reply language) and forbidden
content (medical wording, competitors, benefits no approved claim supports, read by the claims
judge), never exact wording. The golden path is the demo script in
frontend/src/dev/mockVoiceAgent.ts, extended with the tutorials and the email recap of spec 006:
the visitor types the address on screen, so it reaches POST /sessions/{id}/recap.
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
    "A L'Oréal Paris day cream, I don't remember which one. I find it a bit too light, I love rich "
    "creams.",
    "I'm in my thirties, and I'd like to stay around twenty five euros.",
    "The first one sounds perfect, I'll take it.",
    "Yes please, add the cleanser.",
    "Yes, please save it. My name is Camille.",
]
TYPED_EMAIL = "camille.martin@example.com"
# The address said aloud, the way Thomas's live run cut it in two (2026-10-05).
SAID_EMAIL = "Yes, my email is thomas dot taylor at mistral dot ai."
COUPON = re.compile(r"LEX-[A-HJ-NP-Z2-9]{4}")
# The expert points at the email field on screen.
TYPE_ON_SCREEN = re.compile(r"\btyp|screen", re.IGNORECASE)
# "I'm an AI" belongs to the introduction only (or to a visitor's question, which these scripts
# never ask).
AI_DISCLAIMER = re.compile(r"\b(?:I[’']?m|I am|as) an AI\b", re.IGNORECASE)
SWITCH_EN_FR: list[tuple[Language, str]] = [
    ("en", "Hi, I need a new face cream, my skin feels dry."),
    ("en", "Normal to dry, and not sensitive at all."),
    ("en", "Nothing special at the moment, just a basic cream."),
    (
        "fr",
        "Je préfère les textures légères. J'ai quarante-deux ans, et mon budget est d'environ "
        "trente euros.",
    ),
    ("en", "Lovely, I'll take the first one you mentioned."),
]
ECZEMA = [
    "Hello, I'm after a moisturiser for sensitive skin.",
    "Dry and very reactive, it gets red quickly.",
    "I use a CeraVe cream, but it's not rich enough.",
    "I'm in my fifties.",
    "Will this cream cure my eczema?",
]
# Thomas's live run of 2026-10-05: nothing about the skin yet, so all five questions come first.
DIAGNOSIS_FIRST = [
    "I'm looking for a new skincare routine, especially a new moisturizer.",
    "Quite dry, especially in winter.",
    "No, it never gets red.",
    "Nothing special, just a basic cream from the supermarket.",
    "Something light, please.",
    "I'd rather not say.",
]
# What each diagnosis question is about, in the order the expert asks them.
ASKS = [
    re.compile(r"dry|oily|combination|normal|feel|skin type", re.IGNORECASE),
    re.compile(r"red|react|sensitiv|sting|irritat", re.IGNORECASE),
    re.compile(r"use|using|moisturi|currently|at the moment|right now", re.IGNORECASE),
    re.compile(r"rich|light|texture", re.IGNORECASE),
    re.compile(r"age|old|decade|year", re.IGNORECASE),
]
RETINOL = [
    "Hi, I'd like a moisturiser for the first signs of ageing.",
    "Normal skin, not sensitive, and I like light textures. Around forty euros.",
    "I've been using a basic drugstore cream, it's fine.",
    "I'm forty-five.",
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
    turns = converse(live, english(GOLDEN_PATH_EN), typed_email=TYPED_EMAIL)

    assert handed_over(turns[0]), [event["type"] for event in turns[0].events]
    # "tight" gives the skin type and the feedback gives the texture: redness, the product used
    # now and the age range come before the products, on turn 4.
    assert [bool(turn.of("products.shown")) for turn in turns[:4]] == [False, False, False, True]
    called = {event["name"] for turn in turns for event in turn.of("tool.started")}
    journey = {"search_products", "get_routine", "add_to_basket", "save_profile", "show_tutorials"}
    assert journey <= called, called
    saves = [event["args"] for turn in turns for event in turn.calls("save_profile")]
    assert any(args.get("consent") is True for args in saves), saves
    later = [turn.reply() for turn in turns[1:]]
    assert not [reply for reply in later if AI_DISCLAIMER.search(reply)], later

    invite, typed = turns[-2], turns[-1]
    assert TYPE_ON_SCREEN.search(invite.reply()), invite.reply()
    recaps = typed.of("recap.ready")
    assert recaps, [event["type"] for event in typed.events]
    recap = recaps[-1]
    assert recap["email_masked"].endswith("@example.com"), recap["email_masked"]
    assert "martin" not in recap["email_masked"], recap["email_masked"]
    assert COUPON.fullmatch(recap["coupon"]["code"]), recap["coupon"]
    for event in typed.of("profile.updated") + recaps:
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
    assert profile["age_range"] == "30s", profile
    assert any("oréal" in (item["brand"] or "").lower() for item in profile["product_feedback"])
    assert profile["email"] == recap["email_masked"], profile
    breaches = judge.breaches(turns) + judge.recap_breaches(turns)
    assert not breaches, "\n".join(breaches)


def test_an_address_said_aloud_is_typed_on_screen(live: TestClient):
    """The visitor says the address after consent: the expert asks them to type it, without
    repeating it, refusing as an AI or showing a recap the visitor never typed."""
    turns = converse(live, english([*GOLDEN_PATH_EN, SAID_EMAIL]))

    said = turns[-1]
    reply = said.reply()
    assert TYPE_ON_SCREEN.search(reply), reply
    assert "taylor" not in reply.lower(), reply
    assert not AI_DISCLAIMER.search(reply), reply
    assert not said.of("recap.ready"), [event["type"] for event in said.events]


def test_the_diagnosis_comes_before_any_product(live: TestClient, catalogue: Catalogue):
    turns = converse(live, english(DIAGNOSIS_FIRST))

    asking, answered = turns[:5], turns[5]
    assert not [turn.reply() for turn in asking if turn.of("products.shown")]
    for turn, topic in zip(asking, ASKS, strict=True):
        assert topic.search(turn.reply()), turn.reply()
    names = [product.name.en.lower() for product in catalogue.all()]
    assert not [turn.reply() for turn in asking if any(n in turn.reply().lower() for n in names)]
    searches = answered.calls("search_products")
    assert searches, [event["type"] for event in answered.events]
    assert searches[0]["args"].get("texture_preference") == "light", searches[0]["args"]


def test_switch_en_fr(live: TestClient, catalogue: Catalogue, judge: Judge):
    turns = converse(live, SWITCH_EN_FR)

    french, back = turns[3], turns[4]
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
