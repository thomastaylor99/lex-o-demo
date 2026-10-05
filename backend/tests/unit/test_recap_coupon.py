"""Tests for the example in-store coupon of the recap (spec 006)."""

import re
from datetime import date

from app.recap.coupon import make_coupon

CODE = re.compile(r"LEX-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}")  # no O, 0, I or 1
DEMO_DAY = date(2026, 10, 7)


def test_the_code_is_the_same_for_a_session_every_time_and_avoids_ambiguous_characters():
    first = make_coupon("session-1", "en", DEMO_DAY)

    assert make_coupon("session-1", "en", DEMO_DAY) == first
    assert make_coupon("session-2", "en", DEMO_DAY).code != first.code
    codes = [make_coupon(f"session-{i}", "en", DEMO_DAY).code for i in range(200)]
    assert all(CODE.fullmatch(code) for code in codes), codes


def test_the_coupon_lasts_30_days_and_is_labelled_in_the_session_language():
    english = make_coupon("session-1", "en", DEMO_DAY)
    french = make_coupon("session-1", "fr", DEMO_DAY)

    assert english.model_dump(mode="json")["valid_until"] == "2026-11-06"
    assert english.label == "Example offer: 10% off this routine in store"
    assert french.label == "Offre d'exemple : -10 % sur cette routine en magasin"
    assert french.code == english.code
