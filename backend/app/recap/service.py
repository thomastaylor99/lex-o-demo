"""The email recap of the discovery, with an example in-store coupon (spec 006).

Once the visitor has agreed to save their profile, they type their address on screen and
POST /sessions/{id}/recap hands it here. Nothing is ever sent: the recap is shown on screen as a
preview. The address is kept only in masked form, so the full address never reaches the profile,
an event or a log.
"""

import asyncio
from dataclasses import dataclass
from enum import StrEnum
from typing import Any

import structlog
from mistralai.client import Mistral

from app.catalogue.store import Catalogue
from app.conversation.session import Session
from app.profile.models import Consent
from app.recap.check import problems
from app.recap.email import mask_email, normalise_email
from app.recap.facts import RecapFacts, build_facts
from app.recap.template import template_recap
from app.recap.writer import Recap, Writer, mistral_writer

log = structlog.get_logger()

WRITE_BUDGET_S = 6.0
# The session flag that holds the masked address once the recap is on screen (expert's context).
RECAP_FLAG = "recap_on_screen"


class Refusal(StrEnum):
    CONSENT_NEEDED = "consent_needed"
    INVALID_EMAIL = "invalid_email"


class RecapRefused(Exception):
    def __init__(self, reason: Refusal) -> None:
        super().__init__(reason.value)
        self.reason = reason


@dataclass(frozen=True)
class PreparedRecap:
    email_masked: str
    recap: Recap
    coupon: dict[str, Any]  # code, label and valid_until (ISO date)


class RecapService:
    """Writes the recap with the model within a time budget. The template writes it when there
    is no writer, or when the model is slow, fails, answers nothing or breaks a rule of the check.
    """

    def __init__(
        self,
        catalogue: Catalogue,
        model: str,
        writer: Writer | None = None,
        budget_s: float = WRITE_BUDGET_S,
    ) -> None:
        self._catalogue = catalogue
        self._model = model
        self._writer = writer
        self._budget_s = budget_s

    async def prepare(self, session: Session, email: str) -> PreparedRecap:
        """Raises RecapRefused without consent or for an address that does not parse."""
        if session.profile.consent != Consent.GIVEN:
            raise RecapRefused(Refusal.CONSENT_NEEDED)
        address = normalise_email(email)
        if address is None:
            raise RecapRefused(Refusal.INVALID_EMAIL)
        masked = mask_email(address)
        session.profile.email = masked
        facts = build_facts(session, self._catalogue)
        recap = await self._write(facts, session)
        session.flags[RECAP_FLAG] = masked
        return PreparedRecap(masked, recap, facts.coupon.model_dump(mode="json"))

    async def _write(self, facts: RecapFacts, session: Session) -> Recap:
        if self._writer is None:
            return template_recap(facts)
        try:
            async with asyncio.timeout(self._budget_s):
                written = await self._writer(facts)
        except Exception as exc:
            log.warning(
                "recap_writer_failed",
                session_id=session.id,
                error=type(exc).__name__,
                detail=str(exc),
            )
            return template_recap(facts)
        if written.usage is not None:
            session.usage.add_llm(self._model, written.usage)
        found = problems(written.recap.body, facts)
        if found:
            log.warning("recap_rejected", session_id=session.id, problems=found)
            return template_recap(facts)
        return written.recap


def recap_service(client: Mistral | None, model: str, catalogue: Catalogue) -> RecapService:
    """The Mistral writer when there is a client; without one, the template writes every recap."""
    writer = mistral_writer(client, model) if client is not None else None
    return RecapService(catalogue, model, writer)
