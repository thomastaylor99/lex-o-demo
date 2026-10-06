"""Beauty profile (spec 002): filled from the conversation, kept only with consent."""

from enum import StrEnum

from pydantic import BaseModel

from app.catalogue.models import Concern, SkinType, TexturePreference
from app.lang import Language


class BudgetBand(StrEnum):
    UNDER_20 = "under_20"
    FROM_20_TO_40 = "20_to_40"
    FROM_40_TO_80 = "40_to_80"
    OVER_80 = "over_80"


class RoutineSize(StrEnum):
    MINIMAL = "minimal"
    STANDARD = "standard"
    FULL = "full"


class HairType(StrEnum):
    STRAIGHT = "straight"
    WAVY = "wavy"
    CURLY = "curly"
    COILY = "coily"


class AgeRange(StrEnum):
    """Decades, the way visitors say it ("in my forties"); asked as optional (spec 002)."""

    UNDER_30 = "under_30"
    THIRTIES = "30s"
    FORTIES = "40s"
    FIFTIES = "50s"
    SIXTY_PLUS = "60_plus"


class Verdict(StrEnum):
    LIKED = "liked"
    DISLIKED = "disliked"
    MIXED = "mixed"


class ProductFeedback(BaseModel):
    """A product the visitor uses or used, in their words: data for the brands' marketing teams.

    Any brand is kept, other companies' included; the expert never discusses those aloud.
    """

    brand: str | None = None
    product: str | None = None
    verdict: Verdict | None = None
    reason: str | None = None


class Consent(StrEnum):
    PENDING = "pending"
    GIVEN = "given"
    DECLINED = "declined"


class ProfileUpdate(BaseModel):
    """What the extractor may fill from one exchange. Empty means unknown."""

    first_name: str | None = None
    skin_type: SkinType | None = None
    concerns: list[Concern] = []
    sensitive: bool | None = None
    texture_preference: TexturePreference | None = None
    budget_band: BudgetBand | None = None
    routine_size: RoutineSize | None = None
    fragrance_free: bool | None = None
    hair_type: HairType | None = None
    hair_concerns: list[Concern] = []
    age_range: AgeRange | None = None
    product_feedback: list[ProductFeedback] = []


class BeautyProfile(ProfileUpdate):
    language: Language | None = None
    consent: Consent = Consent.PENDING
    email: str | None = None  # masked (c***@gmail.com); set by the recap route only
    # The fields the code read from the basket, where the visitor stated nothing
    # (`app/profile/inferred.py`); a value the visitor states takes the field back.
    inferred: list[str] = []


def merge(profile: BeautyProfile, update: ProfileUpdate) -> BeautyProfile:
    """Known scalars overwrite, lists grow without duplicates; consent and language stay.

    A declined profile never changes again. Only `ProfileUpdate`'s own fields are
    read from `update`, so passing a `BeautyProfile` as the update can never smuggle
    in a consent or a language. An empty string means the visitor's words named
    nothing, so it leaves a known scalar as it was.
    """
    if profile.consent is Consent.DECLINED:
        return profile

    data = profile.model_dump()
    own = set(ProfileUpdate.model_fields)
    fields = update.model_dump(include=own, exclude_none=True)
    whole = update.model_dump(include=own)  # list items keep their None fields, to compare
    for name, value in fields.items():
        if isinstance(value, list):
            current = data.get(name) or []
            data[name] = current + [v for v in whole[name] if v not in current]
        elif value == "":
            continue
        else:
            data[name] = value
            data["inferred"] = [field for field in data["inferred"] if field != name]
    return BeautyProfile.model_validate(data)
