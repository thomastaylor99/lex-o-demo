"""A session's use of the paid models and its running cost in euros (spec 001).

Tokens come from each chat call's usage, speech-to-text seconds from the audio the bridge
forwards, text-to-speech characters from every request started, hedges included. Fixed lines are
synthesised once at startup and cost no session anything.
"""

from dataclasses import dataclass, field

from pydantic import BaseModel

from app.usage.pricing import llm_cost_eur, stt_cost_eur, tts_cost_eur

EUR_DECIMALS = 6


@dataclass(frozen=True)
class TokenUsage:
    prompt_tokens: int = 0
    completion_tokens: int = 0

    def __add__(self, other: TokenUsage) -> TokenUsage:
        return TokenUsage(
            self.prompt_tokens + other.prompt_tokens,
            self.completion_tokens + other.completion_tokens,
        )


class TokenTotals(BaseModel):
    prompt: int
    completion: int


class UsageReport(BaseModel):
    """GET /sessions/{id}/usage: the running cost by stage, and the quantities behind it."""

    cost_eur: float
    llm_eur: float
    stt_eur: float
    tts_eur: float
    tokens: dict[str, TokenTotals]  # by model id
    stt_seconds: float
    tts_characters: int


@dataclass
class UsageMeter:
    """Quantities by model id, priced when read, so a model switch keeps its own price."""

    tokens: dict[str, TokenUsage] = field(default_factory=dict)
    stt_seconds: dict[str, float] = field(default_factory=dict)
    tts_characters: dict[str, int] = field(default_factory=dict)

    def add_llm(self, model: str, usage: TokenUsage) -> None:
        self.tokens[model] = self.tokens.get(model, TokenUsage()) + usage

    def add_stt(self, model: str, seconds: float) -> None:
        self.stt_seconds[model] = self.stt_seconds.get(model, 0.0) + seconds

    def add_tts(self, model: str, characters: int) -> None:
        self.tts_characters[model] = self.tts_characters.get(model, 0) + characters

    def cost_eur(self) -> float:
        return self.report().cost_eur

    def report(self) -> UsageReport:
        llm = sum(
            (llm_cost_eur(m, t.prompt_tokens, t.completion_tokens) for m, t in self.tokens.items()),
            0.0,
        )
        stt = sum((stt_cost_eur(m, s) for m, s in self.stt_seconds.items()), 0.0)
        tts = sum((tts_cost_eur(m, c) for m, c in self.tts_characters.items()), 0.0)
        return UsageReport(
            cost_eur=round(llm + stt + tts, EUR_DECIMALS),
            llm_eur=round(llm, EUR_DECIMALS),
            stt_eur=round(stt, EUR_DECIMALS),
            tts_eur=round(tts, EUR_DECIMALS),
            tokens={
                m: TokenTotals(prompt=t.prompt_tokens, completion=t.completion_tokens)
                for m, t in self.tokens.items()
            },
            stt_seconds=round(sum(self.stt_seconds.values(), 0.0), 2),
            tts_characters=sum(self.tts_characters.values()),
        )
