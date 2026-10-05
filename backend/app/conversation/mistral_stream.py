"""ChatStreamer over the mistralai SDK (spec 001, task T8).

Maps `client.chat.stream_async` events to `StreamDelta`s. The chat spike
(spikes/2026-10-04-chat-engine/README.md) saw bursts of 503s, so a call that
has not produced a first delta within `first_token_timeout_s` is cancelled and
retried: once more on the same model, then once on `fallback_model`. Once a
delta has been yielded, errors propagate to the caller unchanged, so the loop
can turn them into an `error` event. The last chunk of a call carries its token
usage and the answering model, which ride on the last delta for the session meter.
"""

import asyncio
import json
from collections.abc import AsyncIterator
from dataclasses import replace
from typing import Any

import structlog
from mistralai.client import Mistral

from app.conversation.stream import StreamDelta, ToolCallFragment, ToolChoice
from app.usage.meter import TokenUsage

logger = structlog.get_logger(__name__)


def to_delta(delta: Any) -> StreamDelta:
    """Map one `choices[0].delta` to a StreamDelta. Pure: no I/O, no retries."""
    return StreamDelta(
        content=_content_text(delta.content), tool_calls=_tool_call_fragments(delta.tool_calls)
    )


def _content_text(content: Any) -> str | None:
    """`content` is a plain string, or (reasoning on) a list of typed chunks.

    Only `text`-type chunks are kept; `thinking` (and anything else) is dropped.
    """
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        text = "".join(
            part.text
            for part in content
            if getattr(part, "type", None) == "text"
            and isinstance(getattr(part, "text", None), str)
        )
        return text or None
    return None


def _usage(usage: Any) -> TokenUsage | None:
    """A chunk's `UsageInfo` as TokenUsage; only the last chunk of a call carries one."""
    if usage is None:
        return None
    return TokenUsage(usage.prompt_tokens or 0, usage.completion_tokens or 0)


def _tool_call_fragments(tool_calls: Any) -> tuple[ToolCallFragment, ...]:
    if not tool_calls:
        return ()
    return tuple(_one_fragment(call) for call in tool_calls)


def _one_fragment(call: Any) -> ToolCallFragment:
    function = call.function
    arguments = function.arguments if function is not None else ""
    if isinstance(arguments, dict):
        arguments = json.dumps(arguments)
    elif not isinstance(arguments, str):
        arguments = ""
    return ToolCallFragment(
        index=call.index if call.index is not None else 0,
        id=call.id,
        name=function.name if function is not None else None,
        arguments=arguments,
    )


class MistralStreamer:
    """ChatStreamer that calls `client.chat.stream_async`, with retry and fallback."""

    def __init__(
        self,
        client: Mistral,
        *,
        fallback_model: str,
        temperature: float,
        first_token_timeout_s: float,
    ) -> None:
        self._client = client
        self._fallback_model = fallback_model
        self._temperature = temperature
        self._first_token_timeout_s = first_token_timeout_s

    async def stream(
        self,
        *,
        model: str,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None,
        tool_choice: ToolChoice | None,
    ) -> AsyncIterator[StreamDelta]:
        attempt_models = (model, model, self._fallback_model)
        last_error: Exception | None = None
        for attempt, attempt_model in enumerate(attempt_models):
            if attempt == 1:
                logger.warning("llm_retry", model=attempt_model, error=str(last_error))
            elif attempt == 2:
                logger.warning("llm_fallback", model=attempt_model, error=str(last_error))

            yielded = False
            try:
                async for delta in self._attempt(
                    model=attempt_model, messages=messages, tools=tools, tool_choice=tool_choice
                ):
                    yielded = True
                    yield delta
                return
            except Exception as exc:
                if yielded:
                    raise
                last_error = exc

        if last_error is not None:
            raise last_error
        raise RuntimeError("unreachable: MistralStreamer.stream always attempts at least once")

    async def _attempt(
        self,
        *,
        model: str,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None,
        tool_choice: ToolChoice | None,
    ) -> AsyncIterator[StreamDelta]:
        """One call. Raises if no delta arrives within the first-token timeout.

        Closes the stream on every exit: normal completion, error, timeout, or
        the caller cancelling iteration early.
        """
        kwargs: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": self._temperature,
        }
        if tools is not None:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = tool_choice

        async with asyncio.timeout(self._first_token_timeout_s) as deadline:
            async with await self._client.chat.stream_async(**kwargs) as events:
                first_delta = True
                async for event in events:
                    chunk = event.data
                    usage = _usage(chunk.usage)
                    if not chunk.choices:
                        if usage is not None:
                            yield StreamDelta(usage=usage, model=chunk.model)
                        continue
                    delta = to_delta(chunk.choices[0].delta)
                    if usage is not None:
                        delta = replace(delta, usage=usage, model=chunk.model)
                    if first_delta:
                        deadline.reschedule(None)  # first delta arrived: disarm the timeout
                        first_delta = False
                    yield delta
