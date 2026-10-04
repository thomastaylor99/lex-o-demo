"""Fixed lines (welcome, handover, fillers), synthesised once and then served from memory."""

import asyncio
import time
from collections.abc import Iterable

import structlog

from app.conversation.agent import AgentConfig
from app.lang import LANGUAGES, Language
from app.voice.tts import Synthesizer

MAX_PARALLEL_SYNTHESES = 4

logger = structlog.get_logger()


class LineCache:
    """PCM of each fixed line, keyed by agent, line and language."""

    def __init__(self, synthesizer: Synthesizer) -> None:
        self._synthesizer = synthesizer
        self._pcm: dict[tuple[str, str, Language], bytes] = {}

    async def warm(self, agents: Iterable[AgentConfig]) -> None:
        """Synthesise every line of every agent in both languages, which also opens the TTS link.

        A line that stalls twice is skipped and synthesised on its first `get`. Any other error
        stops the warm-up, since it points at the configuration (voice id, API key).
        """
        slots = asyncio.Semaphore(MAX_PARALLEL_SYNTHESES)

        async def load(agent: AgentConfig, line: str, lang: Language) -> None:
            async with slots:
                try:
                    await self.get(agent, line, lang)
                except TimeoutError:
                    logger.warning("line_warm_skipped", agent=agent.id, line=line, language=lang)

        started = time.perf_counter()
        jobs = [
            (agent, line, lang) for agent in agents for line in agent.lines for lang in LANGUAGES
        ]
        async with asyncio.TaskGroup() as group:
            for job in jobs:
                group.create_task(load(*job))
        duration_ms = round((time.perf_counter() - started) * 1000)
        logger.info("lines_warmed", lines=len(self._pcm), of=len(jobs), duration_ms=duration_ms)

    async def get(self, agent: AgentConfig, line: str, lang: Language) -> bytes | None:
        """The line's PCM, synthesised and cached on a miss; None for a line the agent lacks."""
        text = agent.lines.get(line, {}).get(lang)
        if text is None:
            return None
        key = (agent.id, line, lang)
        if key not in self._pcm:
            self._pcm[key] = await self._synthesizer.synthesize(text, agent.voices[lang])
        return self._pcm[key]
