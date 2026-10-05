"""The stream event contract, pinned for the frontend (spec 001).

One realistic example of every event model, serialised exactly as the SSE layer sends it, must
equal frontend/tests/fixtures/stream-events.json, which the frontend tests parse with parseEvent.
After a deliberate change to the contract, rewrite the fixture from backend/ with
    UPDATE_CONTRACT=1 uv run pytest tests/unit/test_event_contract.py
"""

import json
import os
from pathlib import Path
from typing import Any, get_args

from app.catalogue.basket import Basket
from app.catalogue.store import Catalogue
from app.conversation.events import (
    AgentSwitched,
    AnyEvent,
    BasketUpdated,
    ErrorEvent,
    LinePlay,
    ModelCallTiming,
    ProductsShown,
    ProfileUpdated,
    RecapReady,
    TextDelta,
    ToolFinished,
    ToolStarted,
    ToolTiming,
    TurnDone,
    TurnStarted,
    TurnTimings,
    TutorialsShown,
    to_sse,
)
from app.profile.models import BeautyProfile
from app.tools.views import product_view

BACKEND = Path(__file__).resolve().parents[2]
FIXTURE = BACKEND.parent / "frontend" / "tests" / "fixtures" / "stream-events.json"
CATALOGUE = BACKEND / "tests" / "fixtures" / "catalogue_fixture.json"
REWRITE = "UPDATE_CONTRACT=1 uv run pytest tests/unit/test_event_contract.py"
TURN = "8c1f04d2a9e3"
CALL = "Xq3VbT7aP"


def examples() -> list[AnyEvent]:
    """One event of each type, with the values a handover turn that searches could carry."""
    catalogue = Catalogue.load(CATALOGUE)
    pick, alternative = catalogue.get("fx-rich-dry"), catalogue.get("fx-light-dry")
    assert pick is not None and alternative is not None
    basket = Basket()
    basket.add(pick, "en")
    needs = {"skin_type": "dry", "concerns": ["hydration", "sensitivity"], "sensitive": True}
    profile = BeautyProfile.model_validate(
        {"language": "en", **needs, "texture_preference": "rich", "budget_band": "20_to_40"}
    )
    search = {"category": "moisturiser", **needs, "texture_preference": "rich"}
    timings = TurnTimings(
        model_calls=[
            ModelCallTiming(agent="concierge", first_token_ms=388, duration_ms=702),
            ModelCallTiming(agent="skincare", first_token_ms=412, duration_ms=980),
            ModelCallTiming(agent="skincare", first_token_ms=365, duration_ms=1640),
        ],
        tools=[
            ToolTiming(name="transfer_to_agent", duration_ms=0),
            ToolTiming(name="search_products", duration_ms=3),
        ],
        total_ms=3655,
    )
    reason = "Made for dry, reactive skin, in the rich texture you like, and within your budget."
    shown = [product_view(pick, "en", fit=reason), product_view(alternative, "en")]
    return [
        TurnStarted(turn_id=TURN, t_ms=0, agent="concierge", language="en"),
        LinePlay(turn_id=TURN, t_ms=705, agent="concierge", line="handover_skincare"),
        AgentSwitched(turn_id=TURN, t_ms=706, from_agent="concierge", to_agent="skincare"),
        TextDelta(turn_id=TURN, t_ms=1118, agent="skincare", text="I'm L'Oréal's AI skincare"),
        ToolStarted(turn_id=TURN, t_ms=1690, call_id=CALL, name="search_products", args=search),
        ToolFinished(
            turn_id=TURN, t_ms=1693, call_id=CALL, name="search_products", ok=True, duration_ms=3
        ),
        ProductsShown(turn_id=TURN, t_ms=1693, products=shown, best_match_id=pick.id),
        BasketUpdated(turn_id=TURN, t_ms=2410, **basket.view()),
        ProfileUpdated(turn_id=TURN, t_ms=3650, profile=profile.model_dump(mode="json")),
        TutorialsShown(
            turn_id=TURN,
            t_ms=3651,
            tutorials=[
                {
                    "id": "lrp-toleriane-official-tiktok",
                    "product_ids": ["fx-rich-dry"],
                    "brand": "La Roche-Posay",
                    "platform": "tiktok",
                    "creator": "@larocheposay",
                    "creator_kind": "brand",
                    "title": "How to apply your moisturiser",
                    "url": "https://www.tiktok.com/@larocheposay/video/1",
                    "language": "en",
                }
            ],
        ),
        RecapReady(
            turn_id=TURN,
            t_ms=3651,
            email_masked="c***@example.com",
            subject="Your skincare routine, Camille",
            body="Hello Camille, here is the routine we chose together.",
            coupon={"code": "LEX-4F7K", "label": "Example offer", "valid_until": "2026-11-07"},
        ),
        ErrorEvent(turn_id=TURN, t_ms=3652, message="The model did not answer.", recoverable=True),
        TurnDone(turn_id=TURN, t_ms=3655, timings=timings, cost_eur=0.004213),
    ]


def payload(event: AnyEvent) -> dict[str, Any]:
    """The JSON body of the event's SSE frame, read back as the browser reads it."""
    name, data = to_sse(event).removesuffix("\n\n").split("\n")
    assert name == f"event: {event.type}"
    body: dict[str, Any] = json.loads(data.removeprefix("data: "))
    return body


def test_there_is_one_example_per_event_type():
    kinds = [type(event) for event in examples()]

    assert len(kinds) == len(set(kinds))
    assert set(kinds) == set(get_args(AnyEvent))


def test_the_frontend_fixture_matches_the_serialised_events():
    payloads = [payload(event) for event in examples()]
    if os.environ.get("UPDATE_CONTRACT") == "1":
        FIXTURE.parent.mkdir(parents=True, exist_ok=True)
        text = json.dumps(payloads, ensure_ascii=False, indent=2) + "\n"
        FIXTURE.write_text(text, encoding="utf-8")

    assert FIXTURE.exists(), f"{FIXTURE.name} is missing; write it with {REWRITE}"
    stored = json.loads(FIXTURE.read_text(encoding="utf-8"))
    assert stored == payloads, f"the contract changed; if on purpose, run {REWRITE}"
