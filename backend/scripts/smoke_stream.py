"""Live check of MistralStreamer: one text turn, one forced transfer_to_agent call.

Run from backend/: uv run python -m scripts.smoke_stream
(a plain `python scripts/smoke_stream.py` fails: the script's own directory
shadows the backend root on sys.path, so `app` cannot be imported; see smoke_tts.py)
Calls the live Mistral API with the key from Settings(); the key is never printed.
Prints time to first delta, the assembled text, and the assembled tool call.
"""

import asyncio
import time

from mistralai.client import Mistral

from app.conversation.accumulate import ToolCallAccumulator
from app.conversation.mistral_stream import MistralStreamer
from app.logging import configure_logging
from app.settings import Settings

TRANSFER_TOOL = {
    "type": "function",
    "function": {
        "name": "transfer_to_agent",
        "description": "Hand the visitor to a specialist agent, or back if unclear.",
        "parameters": {
            "type": "object",
            "properties": {
                "agent": {"type": "string", "enum": ["skincare", "unclear"]},
                "summary": {
                    "type": "string",
                    "description": "What the visitor needs, for the next agent.",
                },
            },
            "required": ["agent", "summary"],
            "additionalProperties": False,
        },
    },
}
FORCE_TRANSFER = {"type": "function", "function": {"name": "transfer_to_agent"}}


def ms_since(started: float) -> int:
    return round((time.perf_counter() - started) * 1000)


async def run_text_turn(streamer: MistralStreamer, model: str) -> None:
    messages = [{"role": "user", "content": "Say hello in one short sentence."}]
    started = time.perf_counter()
    first_ms: int | None = None
    text = ""
    async for delta in streamer.stream(
        model=model, messages=messages, tools=None, tool_choice=None
    ):
        if first_ms is None:
            first_ms = ms_since(started)
        if delta.content:
            text += delta.content
    print(f"text turn: first delta {first_ms} ms")
    print(f"text turn: reply {text!r}")


async def run_forced_call_turn(streamer: MistralStreamer, model: str) -> None:
    messages = [
        {"role": "user", "content": "Hi, I'm looking for a moisturiser, my skin feels tight."}
    ]
    started = time.perf_counter()
    first_ms: int | None = None
    accumulator = ToolCallAccumulator()
    async for delta in streamer.stream(
        model=model, messages=messages, tools=[TRANSFER_TOOL], tool_choice=FORCE_TRANSFER
    ):
        if first_ms is None:
            first_ms = ms_since(started)
        for fragment in delta.tool_calls:
            accumulator.add(fragment)
    calls = accumulator.complete()
    print(f"forced call turn: first delta {first_ms} ms")
    print(f"forced call turn: assembled call {calls}")


async def main() -> None:
    configure_logging()
    settings = Settings()
    async with Mistral(api_key=settings.mistral_api_key) as client:
        streamer = MistralStreamer(
            client,
            fallback_model=settings.agent_fallback_model,
            temperature=settings.agent_temperature,
            first_token_timeout_s=settings.llm_first_token_timeout_s,
        )
        await run_text_turn(streamer, settings.agent_model)
        await run_forced_call_turn(streamer, settings.agent_model)


if __name__ == "__main__":
    asyncio.run(main())
