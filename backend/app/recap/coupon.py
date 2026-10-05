"""The example in-store coupon of the recap (spec 006), the same for a session every time."""

import hashlib
from datetime import date, timedelta

from pydantic import BaseModel

from app.lang import Language

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # 32 characters: no O, 0, I or 1
CODE_LENGTH = 4
VALID_DAYS = 30
LABELS: dict[Language, str] = {
    "en": "Example offer: 10% off this routine in store",
    "fr": "Offre d'exemple : -10 % sur cette routine en magasin",
}


class Coupon(BaseModel):
    code: str
    label: str
    valid_until: date  # an ISO date in JSON


def coupon_code(session_id: str) -> str:
    """LEX- and four characters drawn from the hash of the session id."""
    digest = hashlib.sha256(session_id.encode()).digest()
    return "LEX-" + "".join(ALPHABET[byte % len(ALPHABET)] for byte in digest[:CODE_LENGTH])


def make_coupon(session_id: str, language: Language, today: date | None = None) -> Coupon:
    day = today or date.today()
    return Coupon(
        code=coupon_code(session_id),
        label=LABELS[language],
        valid_until=day + timedelta(days=VALID_DAYS),
    )
