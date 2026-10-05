"""One spoken turn per language through the live app (marker golden): audio in, the routes, the
conversation, audio out and the cost. The visitor's WAV (scripts/make_test_audio.py) streams to
/ws/transcribe in the browser's frames at real-time pace, the final text to /conversation/stream,
the expert's first sentence to /voice/speak; each stage must add to the session's cost. Bounds are
generous so a slow minute does not fail the test; timings are logged (-rP shows them).
"""

import base64
import json
import time
import wave
from dataclasses import dataclass
from pathlib import Path

import pytest
import structlog
from fastapi.testclient import TestClient

from app.lang import Language
from app.voice.language import detect
from tests.golden.live import Turn, assert_speech, first_sentence, handed_over, take_turn

pytestmark = pytest.mark.golden

AUDIO_DIR = Path(__file__).parents[1] / "fixtures" / "audio"
SAMPLE_RATE = 16_000
FRAME_SAMPLES = 1024  # one frame from frontend/src/lib/mic.ts: 64 ms of 16 kHz int16
FRAME_S = FRAME_SAMPLES / SAMPLE_RATE
HEARD = {"en": ("moisturiser", "moisturizer"), "fr": ("hydratant",)}  # in the final text
OTHER: dict[Language, Language] = {"en": "fr", "fr": "en"}
STT_FINAL_MAX_MS = 3_000  # `end` to the final text; the STT spike's median was 200 ms
FIRST_TEXT_MAX_MS = 6_000  # turn.started to the expert's first words

log = structlog.get_logger()


@dataclass(frozen=True)
class Heard:
    text: str
    language: Language
    stt_final_ms: int
    deltas: int
    cost_eur: float  # the session's cost once the bridge has metered the audio


def session_cost(client: TestClient, session_id: str, wait_s: float = 0.0) -> float:
    """GET /sessions/{id}/usage's cost_eur, polled for up to `wait_s` while it is still zero."""
    deadline = time.perf_counter() + wait_s
    while True:
        usage = client.get(f"/sessions/{session_id}/usage")
        assert usage.status_code == 200, usage.text
        cost = float(usage.json()["cost_eur"])
        if cost > 0 or time.perf_counter() >= deadline:
            return cost
        time.sleep(0.05)


def transcribe(client: TestClient, language: Language, session_id: str) -> Heard:
    """Send the WAV as the browser does: each base64 frame once captured, then `end`."""
    path = AUDIO_DIR / f"visitor_{language}.wav"
    if not path.exists():
        pytest.fail(f"{path.name} is missing: run `uv run python -m scripts.make_test_audio`")
    with wave.open(str(path), "rb") as audio:
        shape = (audio.getnchannels(), audio.getsampwidth(), audio.getframerate())
        assert shape == (1, 2, SAMPLE_RATE), shape
        pcm = audio.readframes(audio.getnframes())
    size = FRAME_SAMPLES * 2
    url = f"/ws/transcribe?language={language}&session_id={session_id}"
    with client.websocket_connect(url) as ws:
        started = time.perf_counter()
        for index, offset in enumerate(range(0, len(pcm), size)):
            time.sleep(max(0.0, started + (index + 1) * FRAME_S - time.perf_counter()))
            frame = base64.b64encode(pcm[offset : offset + size]).decode("ascii")
            ws.send_text(json.dumps({"type": "audio", "audio": frame}))
        ws.send_text(json.dumps({"type": "end"}))
        deltas = 0
        while (message := ws.receive_json())["type"] == "text_delta":
            deltas += 1
        # The bridge meters the audio after `done`, once the upstream stream is closed. A browser
        # leaves it running; TestClient cancels it when this block exits, so wait here.
        cost = session_cost(client, session_id, wait_s=5.0)
    assert message["type"] == "done", message
    return Heard(message["text"], message["language"], message["stt_final_ms"], deltas, cost)


def sentence_ready_ms(turn: Turn, sentence: str) -> int:
    """When the expert's first sentence was complete, in ms since turn.started."""
    text = ""
    for event in turn.of("text.delta"):
        text += event["text"] if event["agent"] == "skincare" else ""
        if len(text.strip()) >= len(sentence):
            return event["t_ms"]
    return turn.done["t_ms"]


@pytest.mark.parametrize("language", ["en", "fr"])
def test_a_spoken_turn_runs_from_audio_in_to_audio_out(live: TestClient, language: Language):
    session = live.post("/sessions", json={"language": language}).json()
    session_id = session["session_id"]
    welcome = live.get(f"/voice/lines/{session['agent']}/{session['welcome_line']}/{language}")
    assert_speech(welcome, min_s=0.5)

    heard = transcribe(live, language, session_id)
    assert heard.deltas > 0, "no live transcript while the visitor spoke"
    assert any(word in heard.text.lower() for word in HEARD[language]), heard.text
    assert heard.language == language, heard

    turn = take_turn(live, session_id, heard.text, heard.language)
    assert handed_over(turn), [event["type"] for event in turn.events]
    reply = turn.reply("skincare")
    assert detect(reply, default=OTHER[language]) == language, reply

    sentence = first_sentence(reply)
    speak = {"agent": "skincare", "language": language, "text": sentence, "session_id": session_id}
    started = time.perf_counter()
    speech = live.post("/voice/speak", json=speak)
    speak_ms = round((time.perf_counter() - started) * 1000)
    speech_s = assert_speech(speech, min_s=0.5)

    handover_ms = turn.of("line.play")[0]["t_ms"]
    first_text_ms = turn.of("text.delta")[0]["t_ms"]
    sentence_ms = sentence_ready_ms(turn, sentence)
    log.info(
        "live_pipeline",
        language=language,
        heard=heard.text,
        reply=reply,
        stt_final_ms=heard.stt_final_ms,
        first_token_ms=[call["first_token_ms"] for call in turn.done["timings"]["model_calls"]],
        handover_line_ms=handover_ms,
        first_text_ms=first_text_ms,
        first_sentence_ms=sentence_ms,
        speak_ms=speak_ms,
        speech_s=round(speech_s, 1),
        first_audio_after_speech_ms=heard.stt_final_ms + handover_ms,
        expert_audio_after_speech_max_ms=heard.stt_final_ms + sentence_ms + speak_ms,
        turn_total_ms=turn.done["timings"]["total_ms"],
    )
    assert heard.stt_final_ms < STT_FINAL_MAX_MS
    assert first_text_ms < FIRST_TEXT_MAX_MS

    turn_cost = turn.done.get("cost_eur", 0.0)
    total_cost = session_cost(live, session_id)
    log.info("live_pipeline_cost", stt=heard.cost_eur, after_turn=turn_cost, total=total_cost)
    assert heard.cost_eur > 0, "the audio sent never reached the session's usage"
    assert turn_cost > heard.cost_eur, "turn.done's cost_eur leaves out the model calls"
    assert total_cost > turn_cost, "the reply's speech never reached the session's usage"
    assert live.delete(f"/sessions/{session_id}").status_code == 204
