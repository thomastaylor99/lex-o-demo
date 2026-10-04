"""Tests for the beauty profile and merge (spec 002)."""

from app.catalogue.models import Concern, SkinType, TexturePreference
from app.profile.models import BeautyProfile, Consent, ProfileUpdate, merge


def test_merge_into_empty_profile_sets_scalars():
    profile = BeautyProfile()
    update = ProfileUpdate(
        first_name="Alex",
        skin_type=SkinType.DRY,
        sensitive=True,
        texture_preference=TexturePreference.RICH,
    )

    merged = merge(profile, update)

    assert merged.first_name == "Alex"
    assert merged.skin_type == SkinType.DRY
    assert merged.sensitive is True
    assert merged.texture_preference == TexturePreference.RICH


def test_later_update_overwrites_skin_type():
    profile = BeautyProfile(skin_type=SkinType.DRY)

    merged = merge(profile, ProfileUpdate(skin_type=SkinType.OILY))

    assert merged.skin_type == SkinType.OILY


def test_concerns_grow_without_duplicates_and_keep_order():
    profile = BeautyProfile(concerns=[Concern.HYDRATION])

    merged = merge(profile, ProfileUpdate(concerns=[Concern.HYDRATION, Concern.SENSITIVITY]))

    assert merged.concerns == [Concern.HYDRATION, Concern.SENSITIVITY]


def test_merging_a_beauty_profile_as_update_keeps_the_original_consent_and_language():
    profile = BeautyProfile(language="en", consent=Consent.PENDING)
    update = BeautyProfile(language="fr", consent=Consent.GIVEN, skin_type=SkinType.DRY)

    merged = merge(profile, update)

    assert merged.consent == Consent.PENDING
    assert merged.language == "en"
    assert merged.skin_type == SkinType.DRY


def test_merging_into_a_declined_profile_changes_nothing():
    profile = BeautyProfile(
        consent=Consent.DECLINED, skin_type=SkinType.DRY, concerns=[Concern.HYDRATION]
    )

    merged = merge(profile, ProfileUpdate(skin_type=SkinType.OILY, concerns=[Concern.SENSITIVITY]))

    assert merged == profile


def test_first_name_empty_string_keeps_the_known_name():
    profile = BeautyProfile(first_name="Alex")

    merged = merge(profile, ProfileUpdate(first_name=""))

    assert merged.first_name == "Alex"


def test_update_with_nothing_set_leaves_profile_equal():
    profile = BeautyProfile(
        skin_type=SkinType.DRY,
        concerns=[Concern.HYDRATION],
        language="en",
        consent=Consent.PENDING,
    )

    merged = merge(profile, ProfileUpdate())

    assert merged == profile
