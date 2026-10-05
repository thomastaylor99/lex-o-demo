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


class BeautyProfile(ProfileUpdate):
    language: Language | None = None
    consent: Consent = Consent.PENDING
    email: str | None = None  # masked (c***@gmail.com); set by send_recap, never by extraction


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
    fields = update.model_dump(include=set(ProfileUpdate.model_fields), exclude_none=True)
    for name, value in fields.items():
        if isinstance(value, list):
            current = data.get(name) or []
            data[name] = current + [v for v in value if v not in current]
        elif value == "":
            continue
        else:
            data[name] = value
    return BeautyProfile.model_validate(data)
