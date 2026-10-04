"""Does the speech endpoint accept a speed or rate parameter, and does it change the audio?

Run: uv run --with "mistralai==3.0.0" --with python-dotenv --with numpy python speed.py
The SDK has no speed argument, so extra fields go through `additional_properties`
(merged into the JSON body) and once over plain HTTP as a cross-check.
"""

from __future__ import annotations

import statistics
from typing import Any

import httpx2 as httpx  # mistralai 3.0.0 installs httpx2; plain httpx is absent
from mistralai.client import Mistral
from mistralai.client.errors import MistralError

from common import MODELS, TEXTS, api_key, b64, make_client, parse_wav

TEXT = TEXTS["en_medium"]
VOICE = "gb_jane_confident"
REPEATS = 3
CANDIDATES: list[dict[str, Any]] = [
    {"speed": 2.0},
    {"speed": 0.5},
    {"rate": 2.0},
    {"speaking_rate": 2.0},
    {"speed_factor": 2.0},
    {"not_a_real_parameter": 1},  # control: are unknown fields rejected at all?
]


def error_text(e: MistralError) -> str:
    body = str(e.body)
    if '"message":' in body:
        body = body.split('"message":', 1)[1][:160]
    return f"{e.status_code}: {body}"


def duration(client: Mistral, model: str, extra: dict[str, Any] | None) -> float:
    r = client.audio.speech.complete(
        model=model, input=TEXT, voice_id=VOICE, response_format="wav", stream=False,
        additional_properties=extra,
    )
    return parse_wav(b64(r.audio_data)).duration_s


def median_duration(client: Mistral, model: str, extra: dict[str, Any] | None) -> str:
    values = [duration(client, model, extra) for _ in range(REPEATS)]
    return f"median {statistics.median(values):.2f} s (runs: {', '.join(f'{v:.2f}' for v in values)})"


def main() -> None:
    with make_client() as client:
        try:
            client.audio.speech.complete(model=MODELS[0], input=TEXT, voice_id=VOICE, speed=2.0)  # type: ignore[call-arg]
            print("direct speed= kwarg: accepted by the SDK")
        except TypeError as e:
            print(f"direct speed= kwarg: TypeError: {e}")

        for model in MODELS:
            print(f"\n{model}, voice {VOICE}, {len(TEXT.split())} words")
            print(f"  baseline: {median_duration(client, model, None)}")
            for extra in CANDIDATES:
                try:
                    duration(client, model, extra)
                except MistralError as e:
                    print(f"  {extra}: rejected {error_text(e)}")
                    continue
                print(f"  {extra}: accepted, {median_duration(client, model, extra)}")

    body = {"model": MODELS[0], "input": TEXT, "voice_id": VOICE, "response_format": "wav", "speed": 2.0}
    resp = httpx.post(
        "https://api.mistral.ai/v1/audio/speech", json=body, timeout=60,
        headers={"Authorization": f"Bearer {api_key()}"},
    )
    detail = resp.text[:200] if resp.status_code != 200 else (
        f"{parse_wav(b64(resp.json()['audio_data'])).duration_s:.2f} s of audio"
    )
    print(f"\nraw HTTP POST with \"speed\": 2.0 on {MODELS[0]}: HTTP {resp.status_code}, {detail}")


if __name__ == "__main__":
    main()
