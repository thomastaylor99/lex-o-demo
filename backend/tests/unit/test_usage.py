"""Tests for the session usage meter and its prices (spec 001)."""

import pytest

from app.usage.meter import TokenUsage, UsageMeter
from app.usage.pricing import STT_EUR_PER_MINUTE, TOKEN_PRICES, TTS_EUR_PER_1K_CHARS

SMALL, MEDIUM = "mistral-small-latest", "mistral-medium-latest"
STT, TTS = "voxtral-transcribe-realtime-3", "voxtral-mini-tts-2603"


def test_cost_adds_tokens_audio_and_characters_at_the_list_prices():
    meter = UsageMeter()
    meter.add_llm(SMALL, TokenUsage(prompt_tokens=1_500_000, completion_tokens=200_000))
    meter.add_llm(SMALL, TokenUsage(prompt_tokens=500_000, completion_tokens=800_000))
    meter.add_llm(MEDIUM, TokenUsage(prompt_tokens=1_000_000, completion_tokens=0))
    meter.add_llm("unpriced-model", TokenUsage(prompt_tokens=1_000, completion_tokens=1_000))
    meter.add_stt(STT, 45.0)
    meter.add_stt(STT, 75.0)
    meter.add_tts(TTS, 1_500)
    meter.add_tts(TTS, 500)

    report = meter.report()

    small, medium = TOKEN_PRICES[SMALL], TOKEN_PRICES[MEDIUM]
    llm = 2 * small.input_eur_per_m + small.output_eur_per_m + medium.input_eur_per_m
    stt = 2 * STT_EUR_PER_MINUTE[STT]  # two minutes
    tts = 2 * TTS_EUR_PER_1K_CHARS[TTS]  # two thousand characters
    assert report.llm_eur == pytest.approx(llm, abs=1e-6)
    assert report.stt_eur == pytest.approx(stt, abs=1e-6)
    assert report.tts_eur == pytest.approx(tts, abs=1e-6)
    assert meter.cost_eur() == report.cost_eur == pytest.approx(llm + stt + tts, abs=1e-6)
    assert report.tokens[SMALL].model_dump() == {"prompt": 2_000_000, "completion": 1_000_000}
    assert report.tokens["unpriced-model"].prompt == 1_000  # counted, at no cost
    assert (report.stt_seconds, report.tts_characters) == (120.0, 2_000)
