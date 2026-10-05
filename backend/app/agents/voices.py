"""Preset TTS voice ids per agent and language (spec 002).

The same voice reads English and French: the spike showed each voice reads French text
correctly. The skincare expert's voice is Jane Neutral on `voxtral-mini-tts-3`, which Thomas
picked by ear on 2026-10-05 over Jane Confident (each sentence sounded differently pushed).
"""

from app.lang import Language

# gb_oliver_cheerful: warm, upbeat British male voice.
CONCIERGE_VOICES: dict[Language, str] = {
    "en": "5ad5d44e-6b4e-4a57-a8a8-4cae088034ed",
    "fr": "5ad5d44e-6b4e-4a57-a8a8-4cae088034ed",
}

# gb_jane_neutral: calm, steady British female voice.
SKINCARE_VOICES: dict[Language, str] = {
    "en": "82c99ee6-f932-423f-a4a3-d403c8914b8d",
    "fr": "82c99ee6-f932-423f-a4a3-d403c8914b8d",
}
