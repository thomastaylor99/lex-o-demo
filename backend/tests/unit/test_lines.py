"""Tests for the fixed-line cache (T14)."""

import asyncio
from collections.abc import AsyncIterator

from app.conversation.agent import AgentConfig
from app.lang import Language
from app.voice.lines import LineCache


class FakeSynthesizer:
    """Records every request; the audio names the voice and the text."""

    def __init__(self, stall_on: str | None = None) -> None:
        self.calls: list[tuple[str, str]] = []
        self.in_flight = 0
        self.max_in_flight = 0
        self.stall_on = stall_on

    async def stream(self, text: str, voice_id: str) -> AsyncIterator[bytes]:
        yield await self.synthesize(text, voice_id)

    async def synthesize(self, text: str, voice_id: str) -> bytes:
        self.calls.append((text, voice_id))
        self.in_flight += 1
        self.max_in_flight = max(self.max_in_flight, self.in_flight)
        try:
            await asyncio.sleep(0.01)
            if text == self.stall_on:
                raise TimeoutError("no first chunk after one retry")
            return pcm_for(text, voice_id)
        finally:
            self.in_flight -= 1


def pcm_for(text: str, voice_id: str) -> bytes:
    return f"{voice_id}|{text}".encode()


def make_agent(agent_id: str, lines: dict[str, dict[Language, str]]) -> AgentConfig:
    return AgentConfig(
        id=agent_id,
        display_name={"en": agent_id, "fr": agent_id},
        role_label={"en": "Adviser", "fr": "Conseil"},
        model="mistral-small-latest",
        instructions="",
        tools=(),
        tool_choice=lambda session: "auto",
        voices={"en": f"{agent_id}-voice-en", "fr": f"{agent_id}-voice-fr"},
        lines=lines,
        context_block=lambda session: "",
    )


CONCIERGE = make_agent(
    "concierge",
    {
        "welcome": {"en": "Welcome!", "fr": "Bienvenue !"},
        "handover": {"en": "Let me bring in our expert.", "fr": "Je vous passe notre experte."},
    },
)
SKINCARE = make_agent(
    "skincare",
    {
        "hello": {"en": "Tell me about your skin.", "fr": "Parlez-moi de votre peau."},
        "search": {"en": "Let me have a look.", "fr": "Je regarde."},
    },
)


async def test_warm_asks_for_every_line_of_every_agent_in_both_languages_with_its_voice():
    synthesizer = FakeSynthesizer()

    await LineCache(synthesizer).warm([CONCIERGE, SKINCARE])

    assert sorted(synthesizer.calls) == sorted(
        [
            ("Welcome!", "concierge-voice-en"),
            ("Bienvenue !", "concierge-voice-fr"),
            ("Let me bring in our expert.", "concierge-voice-en"),
            ("Je vous passe notre experte.", "concierge-voice-fr"),
            ("Tell me about your skin.", "skincare-voice-en"),
            ("Parlez-moi de votre peau.", "skincare-voice-fr"),
            ("Let me have a look.", "skincare-voice-en"),
            ("Je regarde.", "skincare-voice-fr"),
        ]
    )


async def test_warm_runs_at_most_four_syntheses_at_once():
    synthesizer = FakeSynthesizer()

    await LineCache(synthesizer).warm([CONCIERGE, SKINCARE])

    assert synthesizer.max_in_flight == 4


async def test_get_serves_a_warmed_line_from_the_cache():
    synthesizer = FakeSynthesizer()
    cache = LineCache(synthesizer)
    await cache.warm([CONCIERGE, SKINCARE])
    synthesizer.calls.clear()

    pcm = await cache.get(SKINCARE, "hello", "fr")

    assert pcm == pcm_for("Parlez-moi de votre peau.", "skincare-voice-fr")
    assert synthesizer.calls == []


async def test_get_synthesises_a_missing_line_once_then_serves_it_from_the_cache():
    synthesizer = FakeSynthesizer()
    cache = LineCache(synthesizer)

    first = await cache.get(CONCIERGE, "welcome", "en")
    second = await cache.get(CONCIERGE, "welcome", "en")

    assert first == second == pcm_for("Welcome!", "concierge-voice-en")
    assert synthesizer.calls == [("Welcome!", "concierge-voice-en")]


async def test_get_returns_none_for_an_unknown_line():
    synthesizer = FakeSynthesizer()

    assert await LineCache(synthesizer).get(CONCIERGE, "goodbye", "en") is None
    assert synthesizer.calls == []


async def test_warm_skips_a_line_that_stalls_and_caches_the_others():
    synthesizer = FakeSynthesizer(stall_on="Welcome!")
    cache = LineCache(synthesizer)

    await cache.warm([CONCIERGE, SKINCARE])
    synthesizer.calls.clear()

    assert await cache.get(CONCIERGE, "welcome", "fr") == pcm_for(
        "Bienvenue !", "concierge-voice-fr"
    )
    assert synthesizer.calls == []
