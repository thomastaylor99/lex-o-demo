"""Session routes (spec 001): open a visitor conversation, read its running cost, prepare the email
recap from the address the visitor typed (spec 006), and end it."""

import time
from uuid import uuid4

import structlog
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.conversation.events import AnyEvent, ProfileUpdated, RecapReady
from app.lang import Language
from app.recap.service import RecapRefused, Refusal
from app.services import Services
from app.usage.meter import UsageReport

WELCOME_LINE = "welcome"  # the first agent's fixed line the browser plays to open the session

logger = structlog.get_logger()
router = APIRouter()


class SessionRequest(BaseModel):
    language: Language = "en"


class SessionResponse(BaseModel):
    session_id: str
    agent: str
    language: Language
    welcome_line: str


class RecapRequest(BaseModel):
    email: str = Field(max_length=254, description="The address the visitor typed on screen.")


class RecapResponse(BaseModel):
    """What the screen applies, as a turn would stream it (the profile with the masked address,
    then the recap), and the running cost, which the writer's model call raises."""

    events: list[AnyEvent]
    cost_eur: float


@router.post("/sessions")
async def create_session(request: Request, body: SessionRequest | None = None) -> SessionResponse:
    """A new session with the first agent. Without a body the language is English."""
    services: Services = request.app.state.services
    session = services.sessions.create(body.language if body is not None else "en")
    logger.info("session_created", session_id=session.id, language=session.language)
    return SessionResponse(
        session_id=session.id,
        agent=session.active_agent,
        language=session.language,
        welcome_line=WELCOME_LINE,
    )


@router.get("/sessions/{session_id}/usage")
async def session_usage(session_id: str, request: Request) -> UsageReport:
    """The session's running cost in euros, by stage, with the tokens, seconds and characters."""
    services: Services = request.app.state.services
    session = services.sessions.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Unknown session {session_id!r}")
    return session.usage.report()


@router.post("/sessions/{session_id}/recap")
async def prepare_recap(session_id: str, body: RecapRequest, request: Request) -> RecapResponse:
    """The recap preview with its example in-store offer, from the typed address. Nothing is sent.

    409 (`consent_needed`) before the visitor agreed to save their profile, 400 (`invalid_email`)
    for an address that does not parse. It waits for a turn in flight, so the two never write the
    profile at once.
    """
    services: Services = request.app.state.services
    session = services.sessions.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Unknown session {session_id!r}")
    if services.recap is None:
        raise HTTPException(status_code=503, detail="recap_unavailable")
    started = time.perf_counter()
    async with session.lock:
        try:
            prepared = await services.recap.prepare(session, body.email)
        except RecapRefused as refused:
            status = 409 if refused.reason is Refusal.CONSENT_NEEDED else 400
            raise HTTPException(status_code=status, detail=refused.reason.value) from None
    turn_id = f"recap-{uuid4().hex[:12]}"
    t_ms = round((time.perf_counter() - started) * 1000)
    profile = session.profile.model_dump(mode="json")
    events: list[AnyEvent] = [
        ProfileUpdated(turn_id=turn_id, t_ms=t_ms, profile=profile),
        RecapReady(
            turn_id=turn_id,
            t_ms=t_ms,
            email_masked=prepared.email_masked,
            subject=prepared.recap.subject,
            body=prepared.recap.body,
            coupon=prepared.coupon,
        ),
    ]
    logger.info("recap_prepared", session_id=session.id, email=prepared.email_masked, ms=t_ms)
    return RecapResponse(events=events, cost_eur=session.usage.cost_eur())


@router.delete("/sessions/{session_id}", status_code=204)
async def end_session(session_id: str, request: Request) -> None:
    services: Services = request.app.state.services
    if not services.sessions.end(session_id):
        raise HTTPException(status_code=404, detail=f"Unknown session {session_id!r}")
    logger.info("session_ended", session_id=session_id)
