"""Why a product suits this visitor, in one sentence built from facts (spec 006).

Only catalogue facts that match the visitor's profile go in, never a benefit claim, so every
word stays traceable; the brand's approved claim stays on the card as the benefit. Skin
concerns stay out: a concern match reads as a benefit ("for radiance").
"""

from decimal import Decimal

from app.catalogue.models import Concern, Product, RoutineStep
from app.catalogue.ranking import TEXTURES, SearchQuery
from app.lang import Language
from app.profile.models import BeautyProfile, BudgetBand

MAX_CHARS = 100  # one short line of reasons on the card (Thomas: "one sentence, short")
MAX_EXTRA_FACTS = 3  # after the lead, the skin (or hair) match
HAIR_CONCERNS = frozenset({Concern.DRY_HAIR, Concern.FRIZZ, Concern.DAMAGED_HAIR})
NBSP = "\u00a0"  # French puts a no-break space before a colon

# Lower and upper bound of each band, as the profile extractor bands the visitor's maximum.
BUDGET_RANGES: dict[BudgetBand, tuple[Decimal, Decimal | None]] = {
    BudgetBand.UNDER_20: (Decimal(0), Decimal(20)),
    BudgetBand.FROM_20_TO_40: (Decimal(20), Decimal(40)),
    BudgetBand.FROM_40_TO_80: (Decimal(40), Decimal(80)),
    BudgetBand.OVER_80: (Decimal(80), None),
}

# Short phrases: "For dry, sensitive skin: the rich texture you like, fragrance-free, within your
# budget." Each is a catalogue fact matched to the profile, never a benefit.
WORDS: dict[Language, dict[str, str]] = {
    "en": {
        "for": "For {}",
        "skin": "{} skin",
        "dry": "dry",
        "normal": "normal",
        "combination": "combination",
        "oily": "oily",
        "type_and_sensitive": "{}, sensitive",
        "sensitive": "sensitive",
        "dry_hair": "dry hair",
        "frizz": "frizz-prone hair",
        "damaged_hair": "damaged hair",
        "rich": "the rich texture you like",
        "light": "the light texture you like",
        "fragrance_free": "fragrance-free",
        "spf": "SPF {} for daytime",
        "within_budget": "within your budget",
        "colon": ": ",
    },
    "fr": {
        "for": "Pour {}",
        "skin": "peau {}",
        "dry": "sèche",
        "normal": "normale",
        "combination": "mixte",
        "oily": "grasse",
        "type_and_sensitive": "{} et sensible",
        "sensitive": "sensible",
        "dry_hair": "cheveux secs",
        "frizz": "cheveux sujets aux frisottis",
        "damaged_hair": "cheveux abîmés",
        "rich": "la texture riche que vous aimez",
        "light": "la texture légère que vous aimez",
        "fragrance_free": "sans parfum",
        "spf": "SPF {} pour la journée",
        "within_budget": "dans votre budget",
        "colon": f"{NBSP}: ",
    },
}


def fit_sentence(product: Product, profile: BeautyProfile, language: Language) -> str | None:
    """One sentence, or None when nothing in the profile matches the product yet: the skin (or
    hair) match, then at most three facts by relevance (SPF for a protect step, texture,
    fragrance-free, budget), the last ones dropped while it is over 150 characters. SPF only
    comes with a match."""
    words = WORDS[language]
    lead = _lead(product, profile, words)
    matches = _matches(product, profile, words)
    if lead is None and not matches:
        return None
    spf = product.spf if product.routine_step is RoutineStep.PROTECT else None
    facts = (([words["spf"].format(spf)] if spf else []) + matches)[:MAX_EXTRA_FACTS]
    sentence = _sentence(lead, facts, words)
    while len(sentence) > MAX_CHARS and len(facts) > 1:
        facts.pop()
        sentence = _sentence(lead, facts, words)
    return sentence


def search_profile(profile: BeautyProfile, query: SearchQuery) -> BeautyProfile:
    """The profile with a search's criteria laid over it, for the fit of its results. The
    extractor runs beside the turn, so the visitor's latest answers can reach the search first."""
    known: dict[str, object] = {
        "skin_type": query.skin_type,
        "sensitive": query.sensitive,
        "texture_preference": query.texture_preference,
        "fragrance_free": query.fragrance_free,
        "budget_band": None if query.max_price_eur is None else band_for(query.max_price_eur),
    }
    hair = [c for c in query.concerns if c in HAIR_CONCERNS and c not in profile.hair_concerns]
    if hair:
        known["hair_concerns"] = [*profile.hair_concerns, *hair]
    return profile.model_copy(update={k: v for k, v in known.items() if v is not None})


def band_for(max_price_eur: Decimal) -> BudgetBand:
    """The band a visitor's maximum falls in."""
    return next(
        band for band, (_, high) in BUDGET_RANGES.items() if high is None or max_price_eur <= high
    )


def _lead(product: Product, profile: BeautyProfile, words: dict[str, str]) -> str | None:
    """'For dry, sensitive skin', 'For dry skin', 'For sensitive skin' or 'For dry hair'."""
    sensitive = bool(profile.sensitive and product.suitable_for_sensitive)
    if profile.skin_type is not None and profile.skin_type in product.skin_types:
        kind = words[profile.skin_type]
        kind = words["type_and_sensitive"].format(kind) if sensitive else kind
        return words["for"].format(words["skin"].format(kind))
    hair = [c for c in profile.hair_concerns if c in HAIR_CONCERNS and c in product.concerns]
    if hair:
        return words["for"].format(words[hair[0]])
    return words["for"].format(words["skin"].format(words["sensitive"])) if sensitive else None


def _matches(product: Product, profile: BeautyProfile, words: dict[str, str]) -> list[str]:
    """Texture, fragrance-free and budget, where the profile asks for what the product has."""
    facts: list[str] = []
    preference = profile.texture_preference
    if preference is not None and product.texture in TEXTURES[preference]:
        facts.append(words[preference])
    if profile.fragrance_free and product.fragrance_free:
        facts.append(words["fragrance_free"])
    band = profile.budget_band
    if band is not None:
        _, high = BUDGET_RANGES[band]
        if high is None or product.price_eur <= high:
            facts.append(words["within_budget"])
    return facts


def _sentence(lead: str | None, facts: list[str], words: dict[str, str]) -> str:
    """'Lead: a, b, c.' or, without a lead, 'A, b, c.'"""
    listed = ", ".join(facts)
    if lead is None:
        return f"{listed[0].upper()}{listed[1:]}."
    return f"{lead}{words['colon']}{listed}." if listed else f"{lead}."
