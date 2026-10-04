"""Session routes (spec 001): open a visitor conversation, and end it."""

import structlog
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.lang import Language
from app.services import Services

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


@router.delete("/sessions/{session_id}", status_code=204)
async def end_session(session_id: str, request: Request) -> None:
    services: Services = request.app.state.services
    if not services.sessions.end(session_id):
        raise HTTPException(status_code=404, detail=f"Unknown session {session_id!r}")
    logger.info("session_ended", session_id=session_id)
