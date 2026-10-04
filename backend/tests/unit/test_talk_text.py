"""Tests for the terminal client's helpers (T24): sentence splitting, STT bias, VAD, speaker clock.

No audio device opens: the speaker's device callback is called directly.
"""

import time
from types import SimpleNamespace

import numpy as np
import pytest

from app.catalogue.store import Catalogue
from scripts._audio import FRAME_SAMPLES, SPEAKER_BYTES_PER_S, Speaker, Vad
from scripts.talk import BRANDS, FIXTURE_CATALOGUE, context_bias, split_sentences


def test_a_sentence_ends_at_punctuation_followed_by_a_space():
    sentences, rest = split_sentences("Hello there, lovely to meet you. How does your skin feel")
    assert sentences == ["Hello there, lovely to meet you."]
    assert rest == " How does your skin feel"


def test_a_short_sentence_merges_with_the_next_or_waits_for_the_flush():
    sentences, rest = split_sentences("Great! Let me find a cream for you. Your skin is dry.")
    assert sentences == ["Great! Let me find a cream for you."]
    assert rest == " Your skin is dry."


def test_the_end_of_the_text_ends_a_sentence_unless_a_digit_comes_before():
    assert split_sentences("I'm your AI skincare expert, here to help!") == (
        ["I'm your AI skincare expert, here to help!"],
        "",
    )
    assert split_sentences("This cream costs about 24.") == ([], "This cream costs about 24.")
    assert split_sentences("This cream costs about 24.90 euros. Then") == (
        ["This cream costs about 24.90 euros."],
        " Then",
    )


def test_french_spacing_before_punctuation_still_ends_sentences():
    sentences, rest = split_sentences("Bienvenue chez L'Oréal ! Que recherchez-vous aujourd'hui ?")
    assert sentences == ["Bienvenue chez L'Oréal !", "Que recherchez-vous aujourd'hui ?"]
    assert rest == ""


def test_context_bias_holds_whole_names_in_both_languages_and_the_brands_once():
    catalogue = Catalogue.load(FIXTURE_CATALOGUE)
    bias = context_bias(catalogue)
    for product in catalogue.all():
        assert product.name.en in bias
        assert product.name.fr in bias
    assert set(BRANDS) <= set(bias)
    assert len(bias) == len(set(bias))


def _frame(amplitude: int) -> bytes:
    return np.full(FRAME_SAMPLES, amplitude, dtype="<i2").tobytes()


def test_vad_starts_after_60_ms_of_speech_and_ends_after_600_ms_of_quiet():
    vad = Vad(threshold=500)
    loud, quiet = _frame(3000), _frame(100)
    for _ in range(50):
        vad.feed(quiet)
    assert not vad.started
    assert vad.feed(loud) and vad.feed(loud)
    assert not vad.started
    vad.feed(loud)
    assert vad.started
    for _ in range(29):
        vad.feed(quiet)
    assert not vad.ended
    vad.feed(quiet)
    assert vad.ended


async def test_muted_speaker_times_audio_as_if_it_played_and_drains_after_it():
    speaker = Speaker(muted=True)
    before = time.monotonic()
    speaker.play(bytes(int(SPEAKER_BYTES_PER_S * 0.1)))  # 100 ms from the previous turn
    speaker.mark_turn()
    assert speaker.first_sound_at is None
    speaker.play(bytes(int(SPEAKER_BYTES_PER_S * 0.1)))
    first = speaker.first_sound_at
    assert first == pytest.approx(before + 0.1, abs=0.02)
    await speaker.drained()
    assert time.monotonic() >= first + 0.1


def test_speaker_callback_plays_in_order_and_times_the_turns_first_sample():
    speaker = Speaker()  # never started: the callback is driven by hand
    speaker.play(b"\x01" * 8)  # two samples from before the turn
    speaker.mark_turn()
    speaker.play(b"\x02" * 8)
    outdata = bytearray(24)
    timing = SimpleNamespace(currentTime=10.0, outputBufferDacTime=10.05)
    before = time.monotonic()
    speaker._callback(outdata, 6, timing, None)
    assert bytes(outdata) == b"\x01" * 8 + b"\x02" * 8 + bytes(8)  # then silence
    offset_s = 8 / SPEAKER_BYTES_PER_S
    assert speaker.first_sound_at == pytest.approx(before + 0.05 + offset_s, abs=0.01)
