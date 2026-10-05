"""Drive the live app through its routes as the browser does, and read back what it streams."""

import json
import re
from dataclasses import dataclass
from typing import Any

import numpy as np
from fastapi.testclient import TestClient
from httpx import Response

from app.conversation.events import EVENT_ADAPTER
from app.lang import Language

PCM_FORMAT = "f32le;rate=24000;channels=1"
PCM_BYTES_PER_S = 24_000 * 4
SPEAK_MAX_CHARS = 400  # SpeakRequest's limit
_SENTENCE_END = re.compile(r"(?<=[.!?…])\s+")

Event = dict[str, Any]


@dataclass
class Turn:
    """One visitor line and every event the backend streamed back for it."""

    language: Language
    text: str
    events: list[Event]

    def of(self, kind: str) -> list[Event]:
        return [event for event in self.events if event["type"] == kind]

    def calls(self, tool: str) -> list[Event]:
        """The tool.started events of one tool."""
        return [event for event in self.of("tool.started") if event["name"] == tool]

    def reply(self, agent: str | None = None) -> str:
        """The agents' streamed text, or one agent's."""
        deltas = self.of("text.delta")
        return "".join(e["text"] for e in deltas if agent is None or e["agent"] == agent)

    @property
    def done(self) -> Event:
        return self.events[-1]


def sse_events(body: str) -> list[Event]:
    """Each SSE frame's JSON body. Every frame names its type and satisfies the event contract."""
    events: list[Event] = []
    for frame in body.strip().split("\n\n"):
        name, data = frame.split("\n", 1)
        event = json.loads(data.removeprefix("data: "))
        assert name == f"event: {event['type']}", frame
        EVENT_ADAPTER.validate_python(event)
        events.append(event)
    return events


def take_turn(client: TestClient, session_id: str, text: str, language: Language) -> Turn:
    """POST one visitor line, as the browser does after the final transcript."""
    response = client.post(
        "/conversation/stream",
        json={"session_id": session_id, "text": text, "language": language},
    )
    assert response.status_code == 200, response.text
    turn = Turn(language, text, sse_events(response.text))
    assert turn.events[0]["type"] == "turn.started", turn.events[0]
    assert turn.done["type"] == "turn.done", turn.done
    assert not turn.of("error"), turn.of("error")
    return turn


def converse(client: TestClient, lines: list[tuple[Language, str]]) -> list[Turn]:
    """A new session, one turn per scripted line, then the session ends."""
    created = client.post("/sessions", json={"language": lines[0][0]})
    assert created.status_code == 200, created.text
    session_id = created.json()["session_id"]
    turns = [take_turn(client, session_id, text, language) for language, text in lines]
    client.delete(f"/sessions/{session_id}")
    return turns


def handed_over(turn: Turn) -> bool:
    """The concierge played its handover line and switched to the skincare expert."""
    switches = [(e["from_agent"], e["to_agent"]) for e in turn.of("agent.switched")]
    lines = [(e["agent"], e["line"]) for e in turn.of("line.play")]
    return switches == [("concierge", "skincare")] and ("concierge", "handover_skincare") in lines


def first_sentence(text: str) -> str:
    """What the browser sends to /voice/speak first."""
    return _SENTENCE_END.split(text.strip(), maxsplit=1)[0][:SPEAK_MAX_CHARS]


def assert_speech(response: Response, min_s: float) -> float:
    """The response is audible speech in the agreed PCM format; returns its length in seconds."""
    assert response.status_code == 200, response.text
    assert response.headers["x-audio-format"] == PCM_FORMAT
    pcm = response.content
    assert len(pcm) % 4 == 0, f"{len(pcm)} bytes is not whole float32 samples"
    seconds = len(pcm) / PCM_BYTES_PER_S
    assert seconds >= min_s, f"only {seconds:.2f} s of audio"
    samples = np.frombuffer(pcm, dtype="<f4")
    assert np.isfinite(samples).all() and np.abs(samples).max() > 0.01, "silent or broken audio"
    return seconds
