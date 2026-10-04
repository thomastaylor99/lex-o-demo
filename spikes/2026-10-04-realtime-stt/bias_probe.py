"""Does context_bias work on realtime? First what the SDK accepts, then what the server says to raw frames.

Prints every outcome; nothing is written to the repo.
"""

from __future__ import annotations

import asyncio
import inspect
import json
import time
from typing import Any

import websockets
from mistralai.client import Mistral
from mistralai.client.models import RealtimeTranscriptionSessionUpdatePayload
from mistralai.extra.realtime import RealtimeConnection

from common import CONTEXT_BIAS, SINGLE_WORD_BIAS, load_api_key
from harness import AUDIO_FORMAT, Tap

MODELS = ["voxtral-transcribe-realtime-3", "voxtral-mini-transcribe-realtime-2602"]


def show(label: str, value: Any) -> None:
    print(f"- {label}: {value}")


async def sdk_checks(client: Mistral, model: str) -> None:
    print(f"\n## SDK surface ({model})")
    show("connect() signature", inspect.signature(client.audio.realtime.connect))
    show("update_session() signature", inspect.signature(RealtimeConnection.update_session))
    try:
        connection = await client.audio.realtime.connect(  # type: ignore[call-arg]
            model=model, audio_format=AUDIO_FORMAT, context_bias=CONTEXT_BIAS
        )
        show("connect(context_bias=...)", "accepted")
        await connection.close()
    except TypeError as exc:
        show("connect(context_bias=...)", f"TypeError: {exc}")
    connection = await client.audio.realtime.connect(model=model, audio_format=AUDIO_FORMAT)
    async with connection:
        try:
            await connection.update_session(context_bias=CONTEXT_BIAS)  # type: ignore[call-arg]
            show("update_session(context_bias=...)", "accepted")
        except TypeError as exc:
            show("update_session(context_bias=...)", f"TypeError: {exc}")
    payload = RealtimeTranscriptionSessionUpdatePayload(context_bias=CONTEXT_BIAS, target_streaming_delay_ms=480)  # type: ignore[call-arg]
    show("RealtimeTranscriptionSessionUpdatePayload(context_bias=...) serialises to", payload.model_dump_json())


async def raw_update(client: Mistral, model: str, label: str, session: dict[str, Any]) -> None:
    """Send one raw session.update and print the server's reply frames (no audio sent)."""
    connection = await client.audio.realtime.connect(model=model, audio_format=AUDIO_FORMAT)
    frames: list[dict[str, Any]] = []
    connection._websocket = Tap(connection._websocket, frames)
    async with connection:
        await connection._websocket.send(json.dumps({"type": "session.update", "session": session}))
        sent = time.perf_counter()
        closed = ""
        try:
            async with asyncio.timeout(2.5):  # collect every reply for 2.5 s
                async for _ in connection:
                    pass
        except TimeoutError:
            pass
        except websockets.exceptions.ConnectionClosed as exc:
            closed = f"socket closed by server: code {exc.rcvd.code if exc.rcvd else '?'}, reason {exc.rcvd.reason if exc.rcvd else '?'!r}"
    replies = [f for f in frames if f["dir"] == "in"]
    show(f"raw session.update {label}", json.dumps(session, ensure_ascii=False))
    for f in replies:
        print(f"    +{(f['t'] - sent) * 1000:.0f} ms  {json.dumps(f['frame'], ensure_ascii=False)}")
    if closed:
        print(f"    {closed}")


async def query_param(client: Mistral, model: str, value: str) -> None:
    """Open the websocket by hand with context_bias in the URL, as the SDK's URL builder would carry it."""
    url = client.audio.realtime._build_url(model, server_url=None, query_params={"context_bias": value})
    url = url.replace("https://", "wss://")
    headers = {"Authorization": f"Bearer {load_api_key()}"}
    try:
        async with websockets.connect(url, additional_headers=headers, open_timeout=10) as ws:
            first = json.loads(await asyncio.wait_for(ws.recv(), timeout=5))
            show(f"query param context_bias={value[:40]}...", json.dumps(first, ensure_ascii=False))
    except Exception as exc:  # noqa: BLE001 - a probe reports whatever happens
        show(f"query param context_bias={value[:40]}...", f"{type(exc).__name__}: {exc}")


async def main() -> None:
    async with Mistral(api_key=load_api_key()) as client:
        await sdk_checks(client, MODELS[0])
        for model in MODELS:
            print(f"\n## Server replies to raw frames ({model})")
            await raw_update(
                client, model, "with the requested list (multi-word items)", {"context_bias": CONTEXT_BIAS}
            )
            await raw_update(client, model, "with single-word items", {"context_bias": SINGLE_WORD_BIAS})
            await raw_update(
                client, model, "with a comma-separated string", {"context_bias": ",".join(SINGLE_WORD_BIAS)}
            )
            await raw_update(client, model, "with an unknown field (control)", {"no_such_field": True})
            await raw_update(
                client,
                model,
                "with delay + context_bias in one frame",
                {"target_streaming_delay_ms": 480, "context_bias": SINGLE_WORD_BIAS},
            )
            await raw_update(client, model, "with language", {"language": "fr"})
            await raw_update(client, model, "with an empty turn_detection object", {"turn_detection": {}})
            await query_param(client, model, ",".join(SINGLE_WORD_BIAS))


if __name__ == "__main__":
    asyncio.run(main())
