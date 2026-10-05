"""Leading silence is dropped from the speech stream as it arrives (spec 001)."""

from array import array

from app.voice.trim import RATE, LeadingSilenceTrimmer


def pcm(*samples: float) -> bytes:
    return array("f", samples).tobytes()


def test_silence_before_the_first_word_is_dropped_keeping_20_ms() -> None:
    silence = pcm(*([0.0] * RATE))  # one second
    trimmer = LeadingSilenceTrimmer(max_silence_s=2.0)

    assert trimmer.feed(silence[: len(silence) // 2]) == b""  # still silence: nothing yet
    out = trimmer.feed(silence[len(silence) // 2 :] + pcm(0.5, 0.25))

    kept = array("f", out)
    assert kept[-2:].tolist() == [0.5, 0.25]
    assert len(kept) == int(0.02 * RATE) + 2  # 20 ms of lead-in, then the word


def test_after_the_onset_chunks_pass_untouched() -> None:
    trimmer = LeadingSilenceTrimmer()
    trimmer.feed(pcm(0.3))
    later = pcm(0.0, 0.0, 0.2)
    assert trimmer.feed(later) == later


def test_a_soft_start_is_never_swallowed() -> None:
    quiet = pcm(*([0.001] * int(0.7 * RATE)))
    trimmer = LeadingSilenceTrimmer(max_silence_s=0.6)

    assert trimmer.feed(quiet) == quiet  # past the cap, everything plays


def test_misaligned_chunks_keep_their_bytes() -> None:
    word = pcm(0.0, 0.0, 0.5, 0.25)
    trimmer = LeadingSilenceTrimmer()
    out = trimmer.feed(word[:7]) + trimmer.feed(word[7:]) + trimmer.flush()
    assert out.endswith(pcm(0.5, 0.25))
    assert len(out) % 4 == 0
