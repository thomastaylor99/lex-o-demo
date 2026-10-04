"""Preset TTS voice ids per agent and language (spec 002).

Thomas has not picked voices yet. These presets come from the TTS spike and use the same
voice for English and French: the spike showed each voice reads French text correctly
when given French text. Thomas confirms the pick after listening to the samples in
`spikes/2026-10-04-tts/samples/`.
"""

from app.lang import Language

# gb_oliver_cheerful: warm, upbeat British male voice.
CONCIERGE_VOICES: dict[Language, str] = {
    "en": "5ad5d44e-6b4e-4a57-a8a8-4cae088034ed",
    "fr": "5ad5d44e-6b4e-4a57-a8a8-4cae088034ed",
}

# gb_jane_confident: assured British female voice.
SKINCARE_VOICES: dict[Language, str] = {
    "en": "cbe96cf0-85ec-4a10-accb-0b35c93b6dfd",
    "fr": "cbe96cf0-85ec-4a10-accb-0b35c93b6dfd",
}
