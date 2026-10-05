"""POST /conversation/stream (spec 001): one visitor turn, streamed as server-sent events.

The turn runs under the session's lock, so a session takes one turn at a time. Logs hold the
turn's text and timings, never audio.
"""

import contextlib
from collections.abc import AsyncIterator

import structlog
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.conversation.events import AgentSwitched, TextDone, TurnDone, to_sse
from app.conversation.loop import run_turn
from app.conversation.session import Session
from app.lang import Language
from app.services import Services

SSE_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}

logger = structlog.get_logger()
router = APIRouter()


class TurnRequest(BaseModel):
    session_id: str
    text: str = Field(min_length=1, max_length=1000)
    language: Language | None = None  # the language heard; the session keeps its own when absent


@router.post("/conversation/stream")
async def stream_turn(body: TurnRequest, request: Request) -> StreamingResponse:
    services: Services = request.app.state.services
    session = services.sessions.get(body.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Unknown session {body.session_id!r}")
    return StreamingResponse(
        _frames(services, session, body), media_type="text/event-stream", headers=SSE_HEADERS
    )


async def _frames(services: Services, session: Session, body: TurnRequest) -> AsyncIterator[str]:
    """One SSE frame per event; at turn.done, log the turn and keep its timings."""
    async with session.lock:
        if body.language is not None:
            session.language = body.language
            session.profile.language = body.language
        agent_ids = [session.active_agent]
        reply: list[str] = []
        events = run_turn(
            session,
            body.text,
            agents=services.agents,
            streamer=services.streamer,
            observers=services.observers,
            observer_timeout_s=services.settings.observer_timeout_s,
        )
        async with contextlib.aclosing(events):
            async for event in events:
                if isinstance(event, TextDone):
                    reply.append(event.text)  # what the browser speaks
                elif isinstance(event, AgentSwitched):
                    agent_ids.append(event.to_agent)
                elif isinstance(event, TurnDone):
                    services.keep_timings(event.turn_id, event.timings)
                    logger.info(
                        "turn_done",
                        session_id=session.id,
                        turn_id=event.turn_id,
                        agents=agent_ids,
                        language=session.language,
                        user_text=body.text,
                        reply_text="".join(reply),
                        timings=event.timings.model_dump(),
                        cost_eur=event.cost_eur,
                    )
                yield to_sse(event)
