"""Tests for language detection on the final transcript (T13)."""

import pytest

from app.voice.language import detect

FRENCH = [
    "Je cherche une crème pour peau sèche",
    "Est-ce que ça convient aux peaux sensibles ?",
    "Je préfère les textures légères, et mon budget est d'environ trente euros.",
]
ENGLISH = [
    "I'm looking for a moisturiser",
    "Somewhere around twenty to thirty euros.",
    "Is La Roche-Posay Toleriane richer than Lancôme Hydra Zen?",
]


@pytest.mark.parametrize("text", FRENCH)
def test_french_text_gives_fr_even_when_the_default_is_en(text):
    assert detect(text, default="en") == "fr"


@pytest.mark.parametrize("text", ENGLISH)
def test_english_text_gives_en_even_when_the_default_is_fr(text):
    assert detect(text, default="fr") == "en"


@pytest.mark.parametrize("default", ["en", "fr"])
@pytest.mark.parametrize("text", ["OK", "", "Toleriane Double Repair"])
def test_text_too_short_or_tied_gives_the_default(text, default):
    assert detect(text, default=default) == default
