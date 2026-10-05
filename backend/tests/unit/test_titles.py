"""Video titles as the screen shows them (spec 006)."""

import pytest

from app.catalogue.titles import clean_title


@pytest.mark.parametrize(
    ("raw", "shown"),
    [
        (
            "CLEANSING LIKE A DERM USING THE CERAVE HYDRATING CLEANSER 🧼🫧 #cerave",
            "Cleansing like a derm using the CeraVe hydrating cleanser",
        ),
        (
            "La Roche Posay Toleriane sensitive Riche #skincare #dryskin",
            "La Roche-Posay Toleriane sensitive Riche",
        ),
        (
            "MON AVIS SUR LE NOUVEAU FLUIDE UVMUNE 400 DE LA ROCHE POSAY = LA MEILLEURE PROTECTION",
            "Mon avis sur le nouveau fluide UVMune 400 de La Roche-Posay = la meilleure protection",
        ),
        ("How to Use CeraVe Moisturizing Cream", "How to Use CeraVe Moisturizing Cream"),
        (
            "L’Oreal Revitalift Clinical with vitamin C 🍊 #skincare",
            "L'Oréal Revitalift Clinical with vitamin C",
        ),
    ],
)
def test_titles_lose_hashtags_emoji_and_shouting_and_keep_brand_spelling(
    raw: str, shown: str
) -> None:
    assert clean_title(raw) == shown


def test_a_title_made_only_of_hashtags_falls_back_to_the_raw_text() -> None:
    assert clean_title("#cerave") == "#cerave"
