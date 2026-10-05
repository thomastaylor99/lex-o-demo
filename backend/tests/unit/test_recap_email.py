"""Tests for email addresses as visitors say them: normalise, validate, mask, redact (spec 006)."""

import pytest

from app.recap.email import mask_email, normalise_email, redact_emails


@pytest.mark.parametrize(
    ("said", "address"),
    [
        ("camille dot martin at example dot com", "camille.martin@example.com"),
        ("Jo underscore Smith hyphen Lee at mail dot co dot uk.", "jo_smith-lee@mail.co.uk"),
        ("jo dash lee at example dot com", "jo-lee@example.com"),
        ("camille point martin arobase exemple point fr", "camille.martin@exemple.fr"),
        ("marie tiret du bas curie arobase orange point fr", "marie_curie@orange.fr"),
        ("jean tiret pierre arobase gmail point com", "jean-pierre@gmail.com"),
        ("h é l è n e arobase exemple point fr", "helene@exemple.fr"),
        ("Camille.Martin@Example.com.", "camille.martin@example.com"),
        ("jo@example.at", "jo@example.at"),
    ],
)
def test_normalise_email_reads_spoken_and_written_addresses(said: str, address: str):
    assert normalise_email(said) == address


@pytest.mark.parametrize(
    "said",
    [
        "",
        "camille at example",
        "camille dot martin",
        "at example dot com",
        "camille@example@example.com",
        "camille..martin@example.com",
    ],
)
def test_normalise_email_returns_none_for_an_invalid_address(said: str):
    assert normalise_email(said) is None


def test_mask_email_keeps_the_first_letter_and_the_domain():
    assert mask_email("camille.martin@example.com") == "c***@example.com"


@pytest.mark.parametrize(
    ("text", "redacted"),
    [
        ("Send it to camille dot martin at example dot com.", "Send it to c***@example.com."),
        ('{"email": "camille.martin@example.com"}', '{"email": "c***@example.com"}'),
        ("email me at camille dot martin at example dot com", "email me at c***@example.com"),
        ("c'est camille point martin arobase exemple point fr", "c'est c***@exemple.fr"),
        ("Apply it at night. Look at the shop.", "Apply it at night. Look at the shop."),
    ],
)
def test_redact_emails_masks_every_address_in_a_text(text: str, redacted: str):
    assert redact_emails(text) == redacted
