"""Tests for the log processor that masks email addresses before a line is rendered (spec 006)."""

from typing import Any

import structlog

from app.logging import configure_logging, redact_email_addresses


def test_every_string_value_is_masked_nested_ones_too():
    event = {
        "event": "turn_done",
        "user_text": "Yes, please send it to camille dot martin at example dot com.",
        "browser": {"notes": ["camille.martin@example.com"], "count": 3},
        "args": ("jo@example.org", 1),
    }

    redacted = redact_email_addresses(None, "info", event)

    assert redacted == {
        "event": "turn_done",
        "user_text": "Yes, please send it to c***@example.com.",
        "browser": {"notes": ["c***@example.com"], "count": 3},
        "args": ("j***@example.org", 1),
    }


def test_the_configured_chain_masks_addresses_before_rendering():
    configure_logging()
    line: Any = {"event": "stt_done", "text": "camille point martin arobase exemple point fr"}

    for processor in structlog.get_config()["processors"]:
        line = processor(None, "info", line)

    assert isinstance(line, str)
    assert "c***@exemple.fr" in line
    assert "martin" not in line
