"""Structured logging setup. Configure once, from main.py. Never log secrets.

Every email address, written or spoken, is masked in every string value before a line is
rendered (spec 006): transcripts and replies are logged, and a visitor may say their address.
"""

import logging
import sys
from typing import Any

import structlog
from structlog.typing import EventDict, WrappedLogger

from app.recap.email import redact_emails


def redact_email_addresses(
    _logger: WrappedLogger, _method: str, event_dict: EventDict
) -> EventDict:
    """Mask every email address in every string value, nested ones included."""
    return {key: _redact(value) for key, value in event_dict.items()}


def _redact(value: Any) -> Any:
    if isinstance(value, str):
        return redact_emails(value)
    if isinstance(value, dict):
        return {key: _redact(item) for key, item in value.items()}
    if type(value) in (list, tuple):
        return type(value)(_redact(item) for item in value)
    return value


def configure_logging() -> None:
    """Configure structlog to render human-readable console output with ISO timestamps."""
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            redact_email_addresses,
            structlog.dev.ConsoleRenderer(
                colors=sys.stdout.isatty(),
                exception_formatter=structlog.dev.plain_traceback,
            ),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )
