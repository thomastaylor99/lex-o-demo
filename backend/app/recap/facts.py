"""What the recap may say (spec 006): the session's facts, in the visitor's language.

Products come from the basket and their words from the catalogue: the brand's first approved
claim and first usage note, and the fit sentence built from the profile. Nothing else goes in.
"""

from collections.abc import Iterable
from datetime import date
from typing import Any

import structlog
from pydantic import BaseModel, ConfigDict, ValidationError, field_validator

from app.catalogue.fit import fit_sentence
from app.catalogue.models import Product
from app.catalogue.store import Catalogue
from app.conversation.session import Session
from app.lang import Language
from app.profile.models import BeautyProfile
from app.recap.coupon import Coupon, make_coupon
from app.recap.words import platform_name, preference_words, skin_words, step_label

log = structlog.get_logger()


class ProductFacts(BaseModel):
    brand: str
    name: str
    routine_step: str
    fit: str | None  # why it suits this visitor, built from catalogue facts
    claim: str | None  # the first approved claim, word for word
    usage_note: str | None  # the first usage note, word for word


class TutorialFacts(BaseModel):
    model_config = ConfigDict(frozen=True)

    creator: str
    platform: str  # as written: TikTok, YouTube, Instagram
    title: str

    @field_validator("platform")
    @classmethod
    def _written_name(cls, platform: str) -> str:
        return platform_name(platform)


class RecapFacts(BaseModel):
    first_name: str | None
    language: Language
    skin: str | None
    preferences: list[str]
    products: list[ProductFacts]
    tutorials: list[TutorialFacts]
    coupon: Coupon


def build_facts(session: Session, catalogue: Catalogue, today: date | None = None) -> RecapFacts:
    language, profile = session.language, session.profile
    products = [catalogue.get(item.product_id) for item in session.basket.items]
    return RecapFacts(
        first_name=(profile.first_name or "").strip() or None,
        language=language,
        skin=skin_words(profile, language),
        preferences=preference_words(profile, language),
        products=[_product(p, profile, language) for p in products if p is not None],
        tutorials=_tutorials(session.flags.get("shown_tutorials", [])),
        coupon=make_coupon(session.id, language, today),
    )


def _product(product: Product, profile: BeautyProfile, language: Language) -> ProductFacts:
    claims, notes = product.claims_in(language), product.notes_in(language)
    return ProductFacts(
        brand=product.brand,
        name=product.name.get(language),
        routine_step=step_label(product.routine_step, language),
        fit=fit_sentence(product, profile, language),
        claim=claims[0].text if claims else None,
        usage_note=notes[0].text if notes else None,
    )


def _tutorials(views: Iterable[Any]) -> list[TutorialFacts]:
    """Creator, platform and title of each tutorial shown, once each, in the order shown. A view
    that breaks the contract is left out: the recap goes ahead without it."""
    found: dict[TutorialFacts, None] = {}
    for view in views:
        try:
            found[TutorialFacts.model_validate(view, from_attributes=True)] = None
        except ValidationError:
            log.warning("recap_tutorial_skipped", view_type=type(view).__name__)
    return list(found)
