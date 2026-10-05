"""Words for the recap in English and French: the profile, routine steps, platforms and dates.

Skin concerns stay out of the profile in words, as they stay out of the fit sentence
(app/catalogue/fit.py): next to a product, "for radiance" reads as a benefit no claim backs.
"""

from datetime import date

from app.lang import Language
from app.profile.models import BeautyProfile

SKIN_TYPES: dict[Language, dict[str, str]] = {
    "en": {"dry": "dry", "normal": "normal", "combination": "combination", "oily": "oily"},
    "fr": {"dry": "sèche", "normal": "normale", "combination": "mixte", "oily": "grasse"},
}
TEXTURES: dict[Language, dict[str, str]] = {
    "en": {"rich": "rich textures", "light": "light textures"},
    "fr": {"rich": "textures riches", "light": "textures légères"},
}
BUDGETS: dict[Language, dict[str, str]] = {
    "en": {
        "under_20": "under 20 euros",
        "20_to_40": "20 to 40 euros",
        "40_to_80": "40 to 80 euros",
        "over_80": "over 80 euros",
    },
    "fr": {
        "under_20": "moins de 20 euros",
        "20_to_40": "20 à 40 euros",
        "40_to_80": "40 à 80 euros",
        "over_80": "plus de 80 euros",
    },
}
# Hair types and hair concerns, each as a description of the visitor's hair.
HAIR: dict[Language, dict[str, str]] = {
    "en": {
        "straight": "straight hair",
        "wavy": "wavy hair",
        "curly": "curly hair",
        "coily": "coily hair",
        "dry_hair": "dry hair",
        "frizz": "frizz-prone hair",
        "damaged_hair": "damaged hair",
    },
    "fr": {
        "straight": "cheveux raides",
        "wavy": "cheveux ondulés",
        "curly": "cheveux bouclés",
        "coily": "cheveux crépus",
        "dry_hair": "cheveux secs",
        "frizz": "cheveux sujets aux frisottis",
        "damaged_hair": "cheveux abîmés",
    },
}
PHRASES: dict[Language, dict[str, str]] = {
    "en": {"budget": "budget: {}", "fragrance_free": "fragrance-free"},
    "fr": {"budget": "budget : {}", "fragrance_free": "sans parfum"},
}
# Routine steps as labels. "treat" shows as the serum it is: the word reads as medical.
STEPS: dict[Language, dict[str, str]] = {
    "en": {
        "cleanse": "Cleanser",
        "treat": "Serum",
        "moisturise": "Moisturiser",
        "protect": "Sun protection",
        "hair": "Hair",
    },
    "fr": {
        "cleanse": "Nettoyant",
        "treat": "Sérum",
        "moisturise": "Soin hydratant",
        "protect": "Protection solaire",
        "hair": "Cheveux",
    },
}
PLATFORMS = {"tiktok": "TikTok", "youtube": "YouTube", "instagram": "Instagram"}
MONTHS: dict[Language, list[str]] = {
    "en": (
        "January February March April May June July August September October November December"
    ).split(),
    "fr": (
        "janvier février mars avril mai juin juillet août septembre octobre novembre décembre"
    ).split(),
}


def skin_words(profile: BeautyProfile, language: Language) -> str | None:
    """The skin in a few words (dry, sensitive skin; peau sèche et sensible), None if unknown."""
    parts = [SKIN_TYPES[language][profile.skin_type]] if profile.skin_type else []
    if profile.sensitive:
        parts.append("sensitive" if language == "en" else "sensible")
    if not parts:
        return None
    return f"{', '.join(parts)} skin" if language == "en" else f"peau {' et '.join(parts)}"


def preference_words(profile: BeautyProfile, language: Language) -> list[str]:
    """The rest of the profile, one short phrase each, skin concerns left out."""
    phrases = PHRASES[language]
    words: list[str] = []
    if profile.texture_preference:
        words.append(TEXTURES[language][profile.texture_preference])
    if profile.budget_band:
        words.append(phrases["budget"].format(BUDGETS[language][profile.budget_band]))
    if profile.fragrance_free:
        words.append(phrases["fragrance_free"])
    hair = [profile.hair_type] if profile.hair_type else []
    words.extend(HAIR[language].get(value, value) for value in (*hair, *profile.hair_concerns))
    return words


def step_label(step: str, language: Language) -> str:
    return STEPS[language].get(step, step)


def platform_name(platform: str) -> str:
    return PLATFORMS.get(platform.lower(), platform)


def long_date(day: date, language: Language) -> str:
    """6 November 2026, or 6 novembre 2026 (1er novembre for the first of the month)."""
    number = "1er" if language == "fr" and day.day == 1 else str(day.day)
    return f"{number} {MONTHS[language][day.month - 1]} {day.year}"
