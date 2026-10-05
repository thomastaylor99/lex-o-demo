"""Speech routes (spec 001): a sentence streamed in an agent's voice, and the cached fixed lines.

Voice ids stay server-side. The PCM format travels in the X-Audio-Format header. With a
`session_id`, the characters of every TTS request a sentence starts count in that session's usage.
"""

from collections.abc import AsyncIterator
from functools import partial

import structlog
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel, Field

from app.conversation.agent import AgentConfig
from app.lang import Language
from app.services import Services
from app.voice.lines import LineCache
from app.voice.tts import AUDIO_FORMAT, RequestHook, Synthesizer

PCM_MEDIA_TYPE = "application/octet-stream"
PCM_HEADERS = {"X-Audio-Format": AUDIO_FORMAT}

logger = structlog.get_logger()
router = APIRouter()


class SpeakRequest(BaseModel):
    agent: str
    language: Language
    text: str = Field(min_length=1, max_length=400)
    session_id: str | None = None


@router.post("/voice/speak")
async def speak(body: SpeakRequest, request: Request) -> StreamingResponse:
    """Stream the sentence's PCM as it arrives. Reading the first chunk here makes a stall a 504."""
    agent = _agent(request, body.agent)
    services: Services = request.app.state.services
    synthesizer: Synthesizer = services.synthesizer
    on_request = _count_characters(services, body.session_id)
    chunks = synthesizer.stream(body.text, agent.voices[body.language], on_request=on_request)
    try:
        first = await anext(chunks, b"")
    except TimeoutError:
        logger.warning("tts_timeout", agent=agent.id, language=body.language, text=body.text)
        raise HTTPException(status_code=504, detail="Speech synthesis timed out") from None
    return StreamingResponse(
        _prepend(first, chunks), media_type=PCM_MEDIA_TYPE, headers=PCM_HEADERS
    )


@router.get("/voice/lines/{agent}/{line}/{language}")
async def line_audio(agent: str, line: str, language: Language, request: Request) -> Response:
    """A fixed line's PCM, from the cache."""
    lines: LineCache = request.app.state.services.lines
    pcm = await lines.get(_agent(request, agent), line, language)
    if pcm is None:
        raise HTTPException(status_code=404, detail=f"Unknown line {line!r} for agent {agent!r}")
    return Response(pcm, media_type=PCM_MEDIA_TYPE, headers=PCM_HEADERS)


def _agent(request: Request, agent_id: str) -> AgentConfig:
    agents: dict[str, AgentConfig] = request.app.state.services.agents
    if agent_id not in agents:
        raise HTTPException(status_code=404, detail=f"Unknown agent {agent_id!r}")
    return agents[agent_id]


def _count_characters(services: Services, session_id: str | None) -> RequestHook | None:
    """Adds each TTS request's characters to the session's usage; None without a live session."""
    session = services.sessions.get(session_id) if session_id else None
    if session is None:
        return None
    return partial(session.usage.add_tts, services.settings.tts_model)


async def _prepend(first: bytes, rest: AsyncIterator[bytes]) -> AsyncIterator[bytes]:
    yield first
    async for chunk in rest:
        yield chunk
