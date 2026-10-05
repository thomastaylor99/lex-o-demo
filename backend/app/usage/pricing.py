"""Mistral list prices in euros, keyed by model id, for the running cost on screen (spec 001).

Source: https://mistral.ai/pricing/api, the EUR figures behind its currency switch, read on
2026-10-04. The aliases resolve as the chat spike found: `mistral-small-latest` is Mistral Small 4
(`mistral-small-2603`), `mistral-medium-latest` is Mistral Medium 3.5 (`mistral-medium-2604`).
`voxtral-mini-tts-2603` is Voxtral TTS (docs model card `voxtral-tts-26-03`). A model missing
from these tables costs nothing and logs one warning.
"""

from dataclasses import dataclass

import structlog

logger = structlog.get_logger()


@dataclass(frozen=True)
class TokenPrice:
    input_eur_per_m: float  # per million prompt tokens
    output_eur_per_m: float  # per million completion tokens


SMALL = TokenPrice(input_eur_per_m=0.12, output_eur_per_m=0.50)  # Mistral Small 4
MEDIUM = TokenPrice(input_eur_per_m=1.25, output_eur_per_m=6.40)  # Mistral Medium 3.5

TOKEN_PRICES: dict[str, TokenPrice] = {
    "mistral-small-latest": SMALL,
    "mistral-small-2603": SMALL,
    "mistral-medium-latest": MEDIUM,
    "mistral-medium-2604": MEDIUM,
}

# Euros per minute of audio sent.
STT_EUR_PER_MINUTE: dict[str, float] = {
    # realtime-3 is missing from the public price list; Thomas chose the listed realtime price
    # (2026-10-05) over the Decathlon demo's 0.03.
    "voxtral-transcribe-realtime-3": 0.0053,
    "voxtral-mini-transcribe-realtime-2602": 0.0053,
}

# Euros per 1,000 characters of text sent. The page shows 0.01 EUR beside 0.016 USD, so the euro
# figure looks rounded.
TTS_EUR_PER_1K_CHARS: dict[str, float] = {
    "voxtral-mini-tts-2603": 0.01,
    "voxtral-mini-tts-3": 0.01,  # assumed equal to 2603 until the price page lists it
}

_unpriced: set[str] = set()


def llm_cost_eur(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    price = _price(TOKEN_PRICES, model)
    if price is None:
        return 0.0
    return (
        prompt_tokens * price.input_eur_per_m + completion_tokens * price.output_eur_per_m
    ) / 1_000_000


def stt_cost_eur(model: str, seconds: float) -> float:
    return seconds / 60 * (_price(STT_EUR_PER_MINUTE, model) or 0.0)


def tts_cost_eur(model: str, characters: int) -> float:
    return characters / 1000 * (_price(TTS_EUR_PER_1K_CHARS, model) or 0.0)


def _price[T](table: dict[str, T], model: str) -> T | None:
    if model not in table and model not in _unpriced:
        _unpriced.add(model)
        logger.warning("model_unpriced", model=model)
    return table.get(model)
