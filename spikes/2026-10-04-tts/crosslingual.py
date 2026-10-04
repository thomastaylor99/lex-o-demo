"""Each voice reads the same line in English and in French. Saves samples/<voice>__<lang>.wav.

Run: uv run --with "mistralai==3.0.0" --with python-dotenv --with numpy python crosslingual.py [model]
Each file is then transcribed by Voxtral (no language hint) as an intelligibility proxy.
Accent and warmth need a listener.
"""

from __future__ import annotations

import sys

from common import LINE_EN, LINE_FR, SAMPLES_DIR, STT_MODEL, b64, make_client, parse_wav, transcribe, wer

DEFAULT_MODEL = "voxtral-mini-tts-2603"
LINES = {"en": LINE_EN, "fr": LINE_FR}

# slug: (native language, why it was picked). Tags come from voices.md.
VOICES = {
    "gb_jane_confident": ("en", "female, en_gb, tags assured, poised, confident"),
    "gb_jane_curious": ("en", "female, en_gb, tags inquisitive, open, curious"),
    "gb_oliver_cheerful": ("en", "male, en_gb, tags bright, lively, cheerful"),
    "en_paul_happy": ("en", "male, en_us, tags sunny, easygoing, happy"),
    "fr_marie_happy": ("fr", "female, fr_fr, tags warm, radiant, happy"),
    "fr_marie_neutral": ("fr", "female, fr_fr, tags composed, steady, neutral"),
}


def main() -> None:
    model = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_MODEL
    suffix = "" if model == DEFAULT_MODEL else f"__{model}"
    rows = []
    with make_client() as client:
        for slug, (native, why) in VOICES.items():
            voice_id = client.audio.voices.get(voice_id=slug).id
            for lang in (native, "fr" if native == "en" else "en"):
                res = client.audio.speech.complete(
                    model=model, input=LINES[lang], voice_id=slug, response_format="wav", stream=False
                )
                audio = b64(res.audio_data)
                path = SAMPLES_DIR / f"{slug}__{lang}{suffix}.wav"
                path.write_bytes(audio)
                text, detected = transcribe(client, audio, path.name)
                rows.append((path.name, slug, voice_id, why, native, lang,
                             parse_wav(audio).duration_s, wer(LINES[lang], text), detected))
                print(f"{path.name}: WER {rows[-1][7]:.0%}, detected {detected}: {text}")

    print(f"\nModel {model}, transcription {STT_MODEL}\n")
    print("| File | Voice | Native | Spoken | Audio (s) | Transcript WER | Detected | voice id |")
    print("|---|---|---|---|---|---|---|---|")
    for name, slug, voice_id, why, native, lang, dur, w, detected in rows:
        print(f"| `samples/{name}` | {slug} ({why}) | {native} | {lang} | {dur:.1f} | {w:.0%} | {detected} | `{voice_id}` |")


if __name__ == "__main__":
    main()
