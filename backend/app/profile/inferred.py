"""What the visitor's choices say where their words said nothing (Thomas, 2026-10-06: "the budget
can be inferred from the product we chose, so it can evolve"): the budget band of the dearest
product chosen and the routine size from the number of skin products. The record shows these as
read from the choices; a search, a product card or the recap reads only what the visitor stated.
"""

from decimal import Decimal

from app.catalogue.fit import band_for
from app.profile.models import BeautyProfile, Consent, RoutineSize


def from_basket(profile: BeautyProfile, prices: list[Decimal], skin_products: int) -> BeautyProfile:
    """The profile with the budget band and routine size the basket shows, in the fields the
    visitor left empty or that were read from the basket before."""
    if profile.consent is Consent.DECLINED or not prices:
        return profile
    found = {"budget_band": band_for(max(prices)), "routine_size": _routine_size(skin_products)}
    update: dict[str, object] = {}
    inferred = list(profile.inferred)
    for name, value in found.items():
        if value is None or (getattr(profile, name) is not None and name not in inferred):
            continue
        update[name] = value
        if name not in inferred:
            inferred.append(name)
    return profile.model_copy(update={**update, "inferred": inferred})


def stated(profile: BeautyProfile) -> BeautyProfile:
    """The profile as the visitor stated it, without what the code read from the basket."""
    if not profile.inferred:
        return profile
    return profile.model_copy(update={**dict.fromkeys(profile.inferred), "inferred": []})


def _routine_size(skin_products: int) -> RoutineSize | None:
    """Minimal for one to three products, standard for four or five, full from six (the
    extractor's bands)."""
    if skin_products <= 0:
        return None
    if skin_products <= 3:
        return RoutineSize.MINIMAL
    return RoutineSize.STANDARD if skin_products <= 5 else RoutineSize.FULL
