"""Catalogue schema (spec 002). Data: app/catalogue/data/products.json."""

from datetime import date
from decimal import Decimal
from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, PlainSerializer

from app.lang import Language

PriceEur = Annotated[
    Decimal,
    Field(gt=0, decimal_places=2),
    PlainSerializer(float, return_type=float, when_used="json"),
]


class Division(StrEnum):
    CONSUMER_PRODUCTS = "consumer_products"
    LUXE = "luxe"
    DERMATOLOGICAL_BEAUTY = "dermatological_beauty"
    PROFESSIONAL_PRODUCTS = "professional_products"


class Category(StrEnum):
    MOISTURISER = "moisturiser"
    CLEANSER = "cleanser"
    SERUM = "serum"
    SUNSCREEN = "sunscreen"
    EYE_CARE = "eye_care"
    HAIRCARE = "haircare"


class RoutineStep(StrEnum):
    CLEANSE = "cleanse"
    TREAT = "treat"
    MOISTURISE = "moisturise"
    PROTECT = "protect"
    HAIR = "hair"


class SkinType(StrEnum):
    DRY = "dry"
    NORMAL = "normal"
    COMBINATION = "combination"
    OILY = "oily"


class Concern(StrEnum):
    HYDRATION = "hydration"
    SENSITIVITY = "sensitivity"
    FIRST_SIGNS_OF_AGEING = "first_signs_of_ageing"
    FIRMNESS_WRINKLES = "firmness_wrinkles"
    RADIANCE = "radiance"
    BLEMISH_PRONE = "blemish_prone"
    DRY_HAIR = "dry_hair"
    FRIZZ = "frizz"
    DAMAGED_HAIR = "damaged_hair"


class Texture(StrEnum):
    RICH_CREAM = "rich_cream"
    LIGHT_CREAM = "light_cream"
    GEL_CREAM = "gel_cream"
    FLUID = "fluid"
    LOTION = "lotion"
    BALM = "balm"
    SERUM = "serum"
    GEL = "gel"
    FOAM = "foam"
    OIL = "oil"
    SHAMPOO = "shampoo"
    CONDITIONER = "conditioner"
    MASK = "mask"
    LEAVE_IN = "leave_in"


class TexturePreference(StrEnum):
    RICH = "rich"
    LIGHT = "light"


class Localized(BaseModel):
    model_config = ConfigDict(extra="forbid")

    en: str
    fr: str

    def get(self, lang: Language) -> str:
        return self.en if lang == "en" else self.fr


class LocalizedUrl(BaseModel):
    model_config = ConfigDict(extra="forbid")

    en: HttpUrl
    fr: HttpUrl

    def get(self, lang: Language) -> str:
        return str(self.en) if lang == "en" else str(self.fr)


class Claim(BaseModel):
    """An approved claim or a usage note, quoted word for word from the brand page."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(pattern=r"^[a-z0-9-]+$")
    lang: Language
    text: str = Field(min_length=3)
    source_url: HttpUrl
    copied_on: date


class Product(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(pattern=r"^[a-z0-9-]+$")
    brand: str
    division: Division
    name: Localized
    url: LocalizedUrl
    category: Category
    routine_step: RoutineStep
    skin_types: list[SkinType] = []
    concerns: list[Concern] = []
    suitable_for_sensitive: bool = False
    fragrance_free: bool | None = None
    texture: Texture
    spf: int | None = None
    size_ml: float = Field(gt=0)
    price_eur: PriceEur
    price_source_url: HttpUrl
    approved_claims: list[Claim]
    usage_notes: list[Claim]
    pairs_with: list[str] = []

    def claims_in(self, lang: Language) -> list[Claim]:
        return [c for c in self.approved_claims if c.lang == lang]

    def notes_in(self, lang: Language) -> list[Claim]:
        return [n for n in self.usage_notes if n.lang == lang]

    def has_language(self, lang: Language) -> bool:
        return bool(self.claims_in(lang)) and bool(self.notes_in(lang))
