"""The agents' public config, and the browser's report of each turn's timings (spec 001).

Shapes match frontend/src/lib/api.ts. Voice ids and prompts stay server-side.
"""

from typing import Literal

import structlog
from fastapi import APIRouter, Request
from pydantic import BaseModel

from app.agents import FIRST_AGENT
from app.lang import LANGUAGES, Language
from app.services import Services

logger = structlog.get_logger()
router = APIRouter()


class LocalizedText(BaseModel):
    en: str
    fr: str


class ConfigAgent(BaseModel):
    id: str
    display_name: LocalizedText
    role_label: LocalizedText
    lines: list[str]
    line_texts: dict[str, LocalizedText]  # what each fixed line says, for the transcript


class AppConfig(BaseModel):
    agents: list[ConfigAgent]
    languages: list[Language]
    first_agent: str


class BrowserTimings(BaseModel):
    """The browser's side of a turn, in ms from the end of speech; null for a stage not reached."""

    session_id: str
    mode: Literal["auto", "push_to_talk"]
    stt_final: float | None = None
    request_sent: float | None = None
    first_delta: float | None = None
    first_sentence: float | None = None
    first_audio: float | None = None
    first_audio_kind: Literal["line", "speech"] | None = None


@router.get("/config")
async def config(request: Request) -> AppConfig:
    services: Services = request.app.state.services
    return AppConfig(
        agents=[
            ConfigAgent(
                id=agent.id,
                display_name=LocalizedText.model_validate(agent.display_name),
                role_label=LocalizedText.model_validate(agent.role_label),
                lines=list(agent.lines),
                line_texts={
                    line: LocalizedText.model_validate(texts) for line, texts in agent.lines.items()
                },
            )
            for agent in services.agents.values()
        ],
        languages=list(LANGUAGES),
        first_agent=FIRST_AGENT,
    )


@router.post("/turns/{turn_id}/timings", status_code=204)
async def turn_timings(turn_id: str, body: BrowserTimings, request: Request) -> None:
    """Log the browser's timings next to the backend's for the same turn (null if forgotten)."""
    services: Services = request.app.state.services
    backend = services.turn_timings.get(turn_id)
    logger.info(
        "turn_timings",
        turn_id=turn_id,
        session_id=body.session_id,
        browser=body.model_dump(exclude={"session_id"}),
        backend=None if backend is None else backend.model_dump(),
    )
