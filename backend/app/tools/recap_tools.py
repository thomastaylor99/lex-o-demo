"""The email recap of the discovery, with an example in-store coupon (spec 006).

Nothing is ever sent: the recap is shown on screen as a preview. The address is kept only in
masked form, so the full address never reaches the profile, an event, a tool result or a log.
"""

import asyncio
import json
from typing import Any

import structlog
from mistralai.client import Mistral
from pydantic import BaseModel, Field

from app.catalogue.store import DATA_PATH, Catalogue
from app.conversation.agent import Tool, ToolResult, UiEvent
from app.conversation.session import Session
from app.profile.models import Consent
from app.recap.check import problems
from app.recap.email import mask_email, normalise_email, redact_emails, spell_email
from app.recap.facts import RecapFacts, build_facts
from app.recap.template import template_recap
from app.recap.writer import Recap, Writer, mistral_writer

log = structlog.get_logger()

WRITE_BUDGET_S = 6.0
ASK_CONSENT = (
    "The visitor has not agreed to save their profile yet. Ask for their consent first and call "
    "save_profile with their answer; offer the recap only if they agree."
)
CONFIRM = (
    "Read the address back to the visitor exactly as read_back spells it, ask them to confirm, "
    "and call send_recap again with the same address once they do."
)
SAY_READY = (
    "The recap and the in-store offer are on screen. Say so in one sentence. Do not say it was "
    "sent, and do not read the address aloud."
)
ASK_AGAIN = (
    "That is not a valid email address. Ask the visitor to say it again, read it back to them, "
    "and call send_recap once they confirm."
)


class SendRecapArgs(BaseModel):
    email: str = Field(description="The visitor's email address, as they confirmed it.")


def recap_tool(
    client: Mistral | None,
    model: str,
    *,
    catalogue: Catalogue | None = None,
    writer: Writer | None = None,
    budget_s: float = WRITE_BUDGET_S,
) -> Tool:
    """`catalogue` defaults to the one on disk. `writer` defaults to the Mistral writer when
    there is a client; without either, the template writes every recap."""
    products = catalogue if catalogue is not None else Catalogue.load(DATA_PATH)
    if writer is None and client is not None:
        writer = mistral_writer(client, model)

    async def handle(session: Session, args: SendRecapArgs) -> ToolResult:
        if session.profile.consent != Consent.GIVEN:
            return _not_sent("consent_needed", ASK_CONSENT)
        address = normalise_email(args.email)
        if address is None:
            return _not_sent("invalid_email", ASK_AGAIN)
        if not _confirmed(session, address):
            return _read_back(session, address)
        masked = mask_email(address)
        session.profile.email = masked
        facts = build_facts(session, products)
        recap = await _write(writer, facts, session, model, budget_s)
        return _ready(session, masked, facts, recap)

    return Tool(
        name="send_recap",
        description=(
            "Prepare the email recap of this discovery with an in-store offer, once the visitor "
            "has given consent and confirmed their email address."
        ),
        args_model=SendRecapArgs,
        handler=handle,
        public_args=_public_args,
    )


def _public_args(args: dict[str, Any]) -> dict[str, Any]:
    """The address never reaches the browser in full, even in `tool.started`."""
    return {key: redact_emails(v) if isinstance(v, str) else v for key, v in args.items()}


async def _write(
    writer: Writer | None, facts: RecapFacts, session: Session, model: str, budget_s: float
) -> Recap:
    """The model's recap within the budget; the template's when there is no writer, or when
    the model is slow, fails, answers nothing or breaks a rule the check reads."""
    if writer is None:
        return template_recap(facts)
    try:
        async with asyncio.timeout(budget_s):
            written = await writer(facts)
    except Exception as exc:
        log.warning(
            "recap_writer_failed", session_id=session.id, error=type(exc).__name__, detail=str(exc)
        )
        return template_recap(facts)
    if written.usage is not None:
        session.usage.add_llm(model, written.usage)
    found = problems(written.recap.body, facts)
    if found:
        log.warning("recap_rejected", session_id=session.id, problems=found)
        return template_recap(facts)
    return written.recap


def _ready(session: Session, masked: str, facts: RecapFacts, recap: Recap) -> ToolResult:
    coupon = facts.coupon.model_dump(mode="json")
    content = {"recap_on_screen": True, "coupon_code": facts.coupon.code, "next": SAY_READY}
    recap_view = {
        "email_masked": masked,
        "subject": recap.subject,
        "body": recap.body,
        "coupon": coupon,
    }
    return ToolResult(
        content=json.dumps(content, ensure_ascii=False),
        ui_events=[
            UiEvent(
                type="profile.updated", payload={"profile": session.profile.model_dump(mode="json")}
            ),
            UiEvent(type="recap.ready", payload=recap_view),
        ],
    )


def _confirmed(session: Session, address: str) -> bool:
    """The same address was read back to the visitor in an earlier turn."""
    turn = session.flags.get("pending_email_turn", session.turn_index)
    return session.flags.get("pending_email") == address and turn < session.turn_index


def _read_back(session: Session, address: str) -> ToolResult:
    """First call: keep the address in memory and give the expert its spelling to read back."""
    session.flags["pending_email"] = address
    session.flags["pending_email_turn"] = session.turn_index
    read_back = spell_email(address, session.language)
    content = {"status": "confirm_first", "read_back": read_back, "next": CONFIRM}
    return ToolResult(content=json.dumps(content, ensure_ascii=False))


def _not_sent(reason: str, instruction: str) -> ToolResult:
    return ToolResult(content=json.dumps({"sent": False, "reason": reason, "next": instruction}))
