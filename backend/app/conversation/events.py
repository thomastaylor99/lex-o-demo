"""Stream event contract (spec 001). Mirrored once in frontend/src/lib/events.ts."""

from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter


class _Event(BaseModel):
    model_config = ConfigDict(extra="forbid")  # a misspelt payload key fails loudly

    turn_id: str
    t_ms: int = Field(ge=0, description="Milliseconds since turn.started")


class TurnStarted(_Event):
    type: Literal["turn.started"] = "turn.started"
    agent: str
    language: str


class TextDelta(_Event):
    type: Literal["text.delta"] = "text.delta"
    agent: str
    text: str


class ToolStarted(_Event):
    type: Literal["tool.started"] = "tool.started"
    call_id: str
    name: str
    args: dict[str, Any]


class ToolFinished(_Event):
    type: Literal["tool.finished"] = "tool.finished"
    call_id: str
    name: str
    ok: bool
    duration_ms: int


class LinePlay(_Event):
    type: Literal["line.play"] = "line.play"
    agent: str
    line: str


class AgentSwitched(_Event):
    type: Literal["agent.switched"] = "agent.switched"
    from_agent: str
    to_agent: str


class ProductsShown(_Event):
    type: Literal["products.shown"] = "products.shown"
    products: list[dict[str, Any]]
    best_match_id: str | None = None


class BasketUpdated(_Event):
    type: Literal["basket.updated"] = "basket.updated"
    items: list[dict[str, Any]]
    total_eur: float


class ProfileUpdated(_Event):
    type: Literal["profile.updated"] = "profile.updated"
    profile: dict[str, Any]


class TutorialsShown(_Event):
    """Tutorial videos for the chosen products (spec 006): each item has id, product_ids, brand,
    platform (tiktok, youtube or instagram), creator, creator_kind (brand or creator), title, url,
    language."""

    type: Literal["tutorials.shown"] = "tutorials.shown"
    tutorials: list[dict[str, Any]]


class RecapReady(_Event):
    """The email recap of the discovery, shown as a preview (spec 006). Nothing is sent. The
    coupon has code, label and valid_until (ISO date)."""

    type: Literal["recap.ready"] = "recap.ready"
    email_masked: str
    subject: str
    body: str
    coupon: dict[str, Any]


class ModelCallTiming(BaseModel):
    agent: str
    first_token_ms: int | None
    duration_ms: int


class ToolTiming(BaseModel):
    name: str
    duration_ms: int


class TurnTimings(BaseModel):
    model_calls: list[ModelCallTiming] = []
    tools: list[ToolTiming] = []
    total_ms: int = 0


class TurnDone(_Event):
    type: Literal["turn.done"] = "turn.done"
    timings: TurnTimings
    cost_eur: float = 0.0  # the session's running cost so far


class ErrorEvent(_Event):
    type: Literal["error"] = "error"
    message: str
    recoverable: bool


AnyEvent = (
    TurnStarted
    | TextDelta
    | ToolStarted
    | ToolFinished
    | LinePlay
    | AgentSwitched
    | ProductsShown
    | BasketUpdated
    | ProfileUpdated
    | TutorialsShown
    | RecapReady
    | TurnDone
    | ErrorEvent
)
Event = Annotated[AnyEvent, Field(discriminator="type")]
EVENT_ADAPTER: TypeAdapter[AnyEvent] = TypeAdapter(Event)


def to_sse(event: AnyEvent) -> str:
    """One SSE frame: event name, JSON body, blank line."""
    return f"event: {event.type}\ndata: {event.model_dump_json()}\n\n"
