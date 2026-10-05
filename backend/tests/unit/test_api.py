"""The HTTP API over fake services (T15): a session, a turn as SSE, its cost, and the config."""

from collections.abc import AsyncIterator, Callable
from dataclasses import replace
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.agents import FIRST_AGENT
from app.catalogue.store import Catalogue
from app.conversation.events import EVENT_ADAPTER, AnyEvent, TurnDone, TurnStarted
from app.conversation.session import SessionStore
from app.conversation.stream import StreamDelta
from app.main import create_app
from app.profile.models import Consent
from app.recap.service import RecapService
from app.services import Services
from app.settings import Settings
from app.usage.meter import TokenUsage
from app.voice.lines import LineCache
from app.voice.stt import TranscriptionError, TranscriptionStream
from tests.unit.fakes import ALPHA, BETA, ScriptedStreamer, reply, tool_call

FIXTURE_CATALOGUE = Path(__file__).parents[1] / "fixtures" / "catalogue_fixture.json"
# Alpha stands in for the concierge: its `move` tool plays its handover line and switches to beta.
AGENTS = {agent.id: agent for agent in (replace(ALPHA, id=FIRST_AGENT), BETA)}
USAGE = StreamDelta(usage=TokenUsage(2_000, 100), model="mistral-small-latest")


class SilentSynthesizer:
    async def stream(
        self, text: str, voice_id: str, on_request: Callable[[int], None] | None = None
    ) -> AsyncIterator[bytes]:
        if on_request is not None:
            on_request(len(text))
        yield bytes(4)

    async def synthesize(self, text: str, voice_id: str) -> bytes:
        return bytes(4)


class NoTranscriber:
    async def open(self) -> TranscriptionStream:
        raise TranscriptionError("no speech in this test")


def sse_events(body: str) -> list[AnyEvent]:
    """The data line of each SSE frame, parsed against the event contract."""
    return [
        EVENT_ADAPTER.validate_json(line.removeprefix("data: "))
        for line in body.splitlines()
        if line.startswith("data: ")
    ]


def test_a_session_streams_a_turn_with_the_handover_as_sse():
    synthesizer = SilentSynthesizer()
    services = Services(
        settings=Settings(mistral_api_key=""),
        catalogue=Catalogue.load(FIXTURE_CATALOGUE),
        agents=AGENTS,
        sessions=SessionStore(first_agent=FIRST_AGENT, ttl_s=60),
        streamer=ScriptedStreamer(
            [[tool_call("move")], [*reply("Hello, I am beta.", " Welcome!"), USAGE]]
        ),
        transcriber=NoTranscriber(),
        synthesizer=synthesizer,
        lines=LineCache(synthesizer),
    )

    with TestClient(create_app(services)) as client:
        session = client.post("/sessions", json={"language": "en"}).json()
        session_id = session["session_id"]
        turn = client.post(
            "/conversation/stream",
            json={"session_id": session_id, "text": "I need a moisturiser.", "language": "en"},
        )
        events = sse_events(turn.text)
        turn_id = events[-1].turn_id
        timings = client.post(
            f"/turns/{turn_id}/timings",
            json={
                "session_id": session_id,
                "mode": "push_to_talk",
                "stt_final": 210.5,
                "request_sent": 215,
                "first_delta": 900,
                "first_sentence": None,
                "first_audio": None,
                "first_audio_kind": None,
            },
        )
        speech = client.post(
            "/voice/speak",
            json={"agent": "beta", "language": "en", "text": "Hello.", "session_id": session_id},
        )
        usage = client.get(f"/sessions/{session_id}/usage").json()
        ended = client.delete(f"/sessions/{session_id}")
        unknown = client.post(
            "/conversation/stream", json={"session_id": session_id, "text": "Hello?"}
        )
        config = client.get("/config").json()

    assert session == {
        "session_id": session_id,
        "agent": "concierge",
        "language": "en",
        "welcome_line": "welcome",
    }
    assert turn.status_code == 200
    assert turn.headers["content-type"].startswith("text/event-stream")
    assert turn.headers["cache-control"] == "no-cache"
    assert isinstance(events[0], TurnStarted)
    assert isinstance(events[-1], TurnDone)
    assert [e.type for e in events if e.type in ("line.play", "agent.switched")] == [
        "line.play",
        "agent.switched",
    ]
    assert turn_id in services.turn_timings
    assert speech.status_code == 200
    assert usage["tokens"] == {"mistral-small-latest": {"prompt": 2_000, "completion": 100}}
    assert usage["tts_characters"] == len("Hello.")
    assert events[-1].cost_eur == usage["llm_eur"] > 0
    assert usage["cost_eur"] == pytest.approx(usage["llm_eur"] + usage["tts_eur"], abs=1e-6)
    assert timings.status_code == 204
    assert ended.status_code == 204
    assert unknown.status_code == 404
    assert config["first_agent"] == "concierge"
    assert config["languages"] == ["en", "fr"]
    assert config["agents"][1] == {
        "id": "beta",
        "display_name": {"en": "Beta", "fr": "Beta"},
        "role_label": {"en": "Expert", "fr": "Experte"},
        "lines": ["welcome"],
        "line_texts": {"welcome": {"en": "Hello, I am beta.", "fr": "Bonjour, je suis beta."}},
    }
    assert [agent["id"] for agent in config["agents"]] == ["concierge", "beta"]


def _services(recap: RecapService | None) -> Services:
    synthesizer = SilentSynthesizer()
    return Services(
        settings=Settings(mistral_api_key=""),
        catalogue=Catalogue.load(FIXTURE_CATALOGUE),
        agents=AGENTS,
        sessions=SessionStore(first_agent=FIRST_AGENT, ttl_s=60),
        streamer=ScriptedStreamer([]),
        transcriber=NoTranscriber(),
        synthesizer=synthesizer,
        lines=LineCache(synthesizer),
        recap=recap,
    )


def test_the_typed_address_gets_the_recap_once_the_visitor_has_consented():
    catalogue = Catalogue.load(FIXTURE_CATALOGUE)
    services = _services(RecapService(catalogue, "recap-model"))  # no writer: the template writes

    with TestClient(create_app(services)) as client:
        session_id = client.post("/sessions", json={"language": "en"}).json()["session_id"]
        route = f"/sessions/{session_id}/recap"
        early = client.post(route, json={"email": "camille.martin@example.com"})
        session = services.sessions.get(session_id)
        assert session is not None
        session.profile.consent = Consent.GIVEN
        session.profile.first_name = "Camille"
        session.basket.add(catalogue.get("fx-rich-dry"), "en")
        invalid = client.post(route, json={"email": "camille at example"})
        ready = client.post(route, json={"email": " Camille.Martin@example.com "})
        unknown = client.post("/sessions/nope/recap", json={"email": "camille.martin@example.com"})

    assert (early.status_code, early.json()["detail"]) == (409, "consent_needed")
    assert (invalid.status_code, invalid.json()["detail"]) == (400, "invalid_email")
    assert unknown.status_code == 404
    assert ready.status_code == 200, ready.text
    body = ready.json()
    profile, recap = (EVENT_ADAPTER.validate_python(event) for event in body["events"])
    assert (profile.type, recap.type) == ("profile.updated", "recap.ready")
    assert profile.profile["email"] == recap.email_masked == "c***@example.com"
    assert recap.subject == "Your L'Oréal routine, Camille"
    assert recap.coupon["code"].startswith("LEX-")
    assert profile.turn_id == recap.turn_id
    assert body["cost_eur"] == 0  # the template wrote it: no model call
    assert "martin" not in ready.text.lower()


def test_the_recap_route_answers_503_without_the_service():
    with TestClient(create_app(_services(None))) as client:
        session_id = client.post("/sessions").json()["session_id"]
        response = client.post(f"/sessions/{session_id}/recap", json={"email": "jo@example.com"})

    assert response.status_code == 503
