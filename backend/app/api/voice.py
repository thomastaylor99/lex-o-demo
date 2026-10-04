"""Speech routes (spec 001): a sentence streamed in an agent's voice, and the cached fixed lines.

Voice ids stay server-side. The PCM format travels in the X-Audio-Format header.
"""

from collections.abc import AsyncIterator

import structlog
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel, Field

from app.conversation.agent import AgentConfig
from app.lang import Language
from app.voice.lines import LineCache
from app.voice.tts import AUDIO_FORMAT, Synthesizer

PCM_MEDIA_TYPE = "application/octet-stream"
PCM_HEADERS = {"X-Audio-Format": AUDIO_FORMAT}

logger = structlog.get_logger()
router = APIRouter()


class SpeakRequest(BaseModel):
    agent: str
    language: Language
    text: str = Field(min_length=1, max_length=400)


@router.post("/voice/speak")
async def speak(body: SpeakRequest, request: Request) -> StreamingResponse:
    """Stream the sentence's PCM as it arrives. Reading the first chunk here makes a stall a 504."""
    agent = _agent(request, body.agent)
    synthesizer: Synthesizer = request.app.state.services.synthesizer
    chunks = synthesizer.stream(body.text, agent.voices[body.language])
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


async def _prepend(first: bytes, rest: AsyncIterator[bytes]) -> AsyncIterator[bytes]:
    yield first
    async for chunk in rest:
        yield chunk
