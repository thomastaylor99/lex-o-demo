"""The HTTP API over fake services (T15): a session, one turn streamed as SSE, the config."""

from collections.abc import AsyncIterator
from dataclasses import replace
from pathlib import Path

from fastapi.testclient import TestClient

from app.agents import FIRST_AGENT
from app.catalogue.store import Catalogue
from app.conversation.events import EVENT_ADAPTER, AnyEvent, TurnDone, TurnStarted
from app.conversation.session import SessionStore
from app.main import create_app
from app.services import Services
from app.settings import Settings
from app.voice.lines import LineCache
from app.voice.stt import TranscriptionError, TranscriptionStream
from tests.unit.fakes import ALPHA, BETA, ScriptedStreamer, reply, tool_call

FIXTURE_CATALOGUE = Path(__file__).parents[1] / "fixtures" / "catalogue_fixture.json"
# Alpha stands in for the concierge: its `move` tool plays its handover line and switches to beta.
AGENTS = {agent.id: agent for agent in (replace(ALPHA, id=FIRST_AGENT), BETA)}


class SilentSynthesizer:
    async def stream(self, text: str, voice_id: str) -> AsyncIterator[bytes]:
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
        streamer=ScriptedStreamer([[tool_call("move")], reply("Hello, I am beta.", " Welcome!")]),
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
