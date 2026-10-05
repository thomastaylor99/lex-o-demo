"""Live check of the profile extractor: the chat-engine spike's four sample exchanges
through the real structured-output call.

Run from backend/: uv run python -m scripts.smoke_extractor
Prints each exchange's extraction, the profile merged so far, the latency and tokens per call, and
the session's cost at list prices. The four exchanges are copied from the spike's extractor
benchmark (spikes/2026-10-04-chat-engine/bench_extractor.py); app code never imports from spikes/
(AGENTS.md). Uses the live Mistral API with the key from Settings() and never prints it.
"""

import asyncio
import time

from mistralai.client import Mistral

from app.conversation.session import Session
from app.logging import configure_logging
from app.profile.extractor import Parsed, make_profile_observer, mistral_parser
from app.settings import Settings

# (key, language, adviser line, visitor line)
EXCHANGES = [
    (
        "e1_en_skin",
        "en",
        "Tight skin is no fun, let's get you some comfort. By the end of the day, does it "
        "feel tight all over, or does it get a little shiny on your forehead and nose?",
        "Tight all over, honestly, especially on my cheeks, and it gets flaky when it's cold. "
        "I'm Sarah, by the way.",
    ),
    (
        "e2_en_sensitivity",
        "en",
        "That sounds like dry skin asking for comfort. Does it react easily, like going red or "
        "stinging when you try a new product?",
        "Yes, it goes red really easily, so nothing with perfume please. And I hate heavy "
        "creams, I like something light.",
    ),
    (
        "e3_fr_routine_hair",
        "fr",
        "Et côté routine, vous aimez faire simple ou vous avez plusieurs étapes ?",
        "Je préfère faire simple, deux produits maximum, et pas plus de trente euros chacun. "
        "Ah, et mes cheveux sont bouclés, ils frisottent beaucoup.",
    ),
    (
        "e4_en_trap",
        "en",
        "The Toleriane cream is on your screen. Would you like me to add it to your basket?",
        "Not yet. My sister has really oily skin with lots of breakouts, would it work for her "
        "too?",
    ),
]


def ms_since(started: float) -> int:
    return round((time.perf_counter() - started) * 1000)


async def main() -> None:
    configure_logging()
    settings = Settings()
    async with Mistral(api_key=settings.mistral_api_key) as client:
        raw_parse = mistral_parser(client)
        captured: Parsed | None = None

        async def capturing_parse(model: str, messages: list[dict[str, str]]) -> Parsed:
            nonlocal captured
            captured = await raw_parse(model, messages)
            return captured

        observer = make_profile_observer(capturing_parse, settings.extractor_model)
        session = Session(id="smoke", active_agent="skincare")

        for key, language, adviser, visitor in EXCHANGES:
            session.language = language
            started = time.perf_counter()
            events = await observer(session, visitor, adviser)
            elapsed_ms = ms_since(started)
            print(f"\n{key} ({language}), {elapsed_ms} ms")
            print(f"  adviser: {adviser}")
            print(f"  visitor: {visitor}")
            extraction = captured.extraction if captured else None
            print(f"  extraction: {extraction.model_dump(mode='json') if extraction else None}")
            print(f"  tokens: {captured.usage if captured else None}")
            if events:
                print(f"  profile so far: {events[0].payload['profile']}")
            else:
                print("  profile so far: unchanged (see log above)")

    print(f"\nfinal merged profile:\n  {session.profile.model_dump(mode='json')}")
    print(f"session cost: {session.usage.cost_eur():.6f} EUR")


if __name__ == "__main__":
    asyncio.run(main())
