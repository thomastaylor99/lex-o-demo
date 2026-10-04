"""List every voice, test the v2 filters, check the Decathlon voices. Writes voices.md.

Run: uv run --with "mistralai==3.0.0" --with python-dotenv --with numpy python voices.py
"""

from __future__ import annotations

from collections import Counter
from typing import Any

from mistralai.client import Mistral
from mistralai.client.errors import MistralError
from mistralai.client.models import VoiceResponse
from mistralai.client.types import UNSET

from common import MODELS, SPIKE_DIR, b64, make_client, parse_wav

# From decathlon-reference/agents.py, AGENT_VOICES (plus the fallback on line 181).
DECATHLON_VOICES: list[tuple[str, str, str]] = [
    ("greeter", "en", "gb_oliver_cheerful"),
    ("greeter", "fr", "fr_marie_cheerful"),
    ("hiking", "en", "9c6b33b5-7fbe-48dc-b290-c89c408dc1f1"),  # Tommy UK
    ("hiking", "fr", "ddd8dc78-585c-4e38-abf7-8da555b445be"),  # Nico FR
    ("running", "en", "2b082607-f170-41a4-9fc1-162b78a5e9b5"),  # Natasha US
    ("running", "fr", "fr_marie_cheerful"),
    ("cycling", "en", "en_adam_friendly"),
    ("cycling", "fr", "245c2c82-2600-495b-bbaf-5f19b986e4c7"),  # Mbappé
    ("help", "en", "cbe96cf0-85ec-4a10-accb-0b35c93b6dfd"),  # Jane Confident
    ("help", "fr", "fr_marie_neutral"),
    ("fallback", "-", "en_paul_excited"),
]


def list_v1(client: Mistral, type_: str = "all") -> tuple[list[VoiceResponse], int]:
    """Offset pagination over GET /v1/audio/voices (deprecated 2026-09-07, sunset 2027-03-31)."""
    voices: list[VoiceResponse] = []
    offset, total = 0, 0
    while True:
        page = client.audio.voices.list(limit=50, offset=offset, type_=type_)
        total = page.total
        voices.extend(page.items)
        offset += len(page.items)
        if not page.items or offset >= page.total:
            return voices, total


def search_v2(client: Mistral, **filters: Any) -> list[VoiceResponse]:
    """Token pagination over GET /v2/audio/voices, which also filters."""
    voices: list[VoiceResponse] = []
    token: Any = UNSET
    while True:
        res = client.audio.voices.search(page_size=50, page_token=token, **filters)
        if res is None:
            return voices
        voices.extend(res.result.data)
        token = res.result.next_page_token
        if not token:
            return voices


def probe_tts(client: Mistral, model: str, voice_id: str) -> str:
    try:
        r = client.audio.speech.complete(
            model=model, input="Hello.", voice_id=voice_id, response_format="wav", stream=False
        )
        return f"ok ({parse_wav(b64(r.audio_data)).duration_s:.1f} s)"
    except MistralError as e:
        message = str(e.body)
        if '"message":"' in message:
            message = message.split('"message":"', 1)[1].split('"', 1)[0]
        return f"error {e.status_code}: {message[:70]}"


def compat(client: Mistral, voice: VoiceResponse) -> list[str]:
    """Does a one-word request with this voice work on each model?"""
    return ["yes" if probe_tts(client, m, voice.slug or voice.id).startswith("ok") else "no" for m in MODELS]


def has_lang(voice: VoiceResponse, code: str) -> bool:
    return any(lang == code or lang.startswith(f"{code}_") for lang in voice.languages or [])


def probe_get(client: Mistral, voice_id: str) -> str:
    try:
        v = client.audio.voices.get(voice_id=voice_id)
        return f"ok ({v.type}, {v.name})"
    except MistralError as e:
        return f"error {e.status_code}"


def cell(value: Any) -> str:
    if value is None or value is UNSET:
        return ""
    if isinstance(value, list):
        return ", ".join(str(v) for v in value)
    return str(value).replace("|", "/").replace("\n", " ")


def main() -> None:
    with make_client() as client:
        all_v1, total_v1 = list_v1(client, "all")
        presets_v1, _ = list_v1(client, "preset")
        customs_v1, _ = list_v1(client, "custom")
        all_v2 = search_v2(client, type_="all")
        print(f"v1 list: {len(all_v1)} voices (total field {total_v1}); "
              f"{len(presets_v1)} preset, {len(customs_v1)} custom; v2 search: {len(all_v2)}")

        ids_v1 = {v.id for v in all_v1}
        ids_v2 = {v.id for v in all_v2}
        by_key = {v.id: v for v in all_v1 + all_v2}
        by_key |= {v.slug: v for v in all_v1 + all_v2 if v.slug}

        # Filters (v2 only): one query per language value seen, then gender, then free text.
        lang_counts = Counter(lang for v in all_v1 for lang in (v.languages or []))
        lang_filter = {
            lang: len(search_v2(client, type_="all", language=[lang])) for lang in sorted(lang_counts)
        }
        gender_filter = {
            g: len(search_v2(client, type_="all", gender=[g])) for g in ("female", "male", "neutral")
        }
        fr_female = search_v2(client, type_="preset", language=["fr"], gender=["female"])
        query_marie = search_v2(client, type_="all", query="marie")

        decathlon_rows = []
        for agent, lang, vid in DECATHLON_VOICES:
            listed = by_key.get(vid)
            decathlon_rows.append((
                agent, lang, vid,
                f"yes ({listed.type}, {listed.name})" if listed else "no",
                probe_get(client, vid),
                *(probe_tts(client, m, vid) for m in MODELS),
            ))
            print(decathlon_rows[-1])

        voices = sorted(by_key.values(), key=lambda v: (v.type, ",".join(v.languages or []), v.slug or v.name))
        voices = list({v.id: v for v in voices}.values())
        compat_by_id = {v.id: compat(client, v) for v in voices}
        print("compatibility probed for", len(compat_by_id), "voices")

    lines = [
        "# Voices available to the demo API key",
        "",
        "> Source: `voices.py`, run 2026-10-04 with `mistralai` 3.0.0 against the live API.",
        "",
        f"- `client.audio.voices.list(type_=\"all\")` (GET /v1/audio/voices, offset pagination): "
        f"{len(all_v1)} voices, `total` = {total_v1}; {len(presets_v1)} preset, {len(customs_v1)} custom.",
        f"- `client.audio.voices.search(type_=\"all\")` (GET /v2/audio/voices, token pagination): "
        f"{len(all_v2)} voices. Same ids as v1: {ids_v1 == ids_v2}.",
        "- The SDK marks v1 `list` deprecated on 2026-09-07 with sunset 2027-03-31; "
        "its replacement is v2 `search`.",
        "",
        "## Filtering",
        "",
        "Only v2 `search` filters. It takes `language` (list of codes), `gender` "
        "(list of `female`, `male`, `neutral`), `query` (free text) and `type_` "
        "(`all`, `preset`, `custom`).",
        "",
        "```python",
        "res = client.audio.voices.search(type_=\"preset\", language=[\"fr\"], gender=[\"female\"], page_size=50)",
        "voices = res.result.data  # next page: res.result.next_page_token, or res.next()",
        "```",
        "",
        "`language` matches by prefix: `en` also returns `en_gb` and `en_us` voices. "
        "Voices with an empty `languages` field never match a language filter.",
        "",
        "| `language=[...]` | voices returned by search | `languages` equal to it | `languages` equal to it or starting with it plus `_` |",
        "|---|---|---|---|",
        *(
            f"| `{lang}` | {lang_filter[lang]} | {lang_counts[lang]} | "
            f"{sum(has_lang(v, lang) for v in all_v1)} |"
            for lang in sorted(lang_counts)
        ),
        "",
        "| `gender=[...]` | voices returned |",
        "|---|---|",
        *(f"| `{g}` | {n} |" for g, n in gender_filter.items()),
        "",
        f"`search(type_=\"preset\", language=[\"fr\"], gender=[\"female\"])` returns "
        f"{len(fr_female)}: {', '.join(sorted(v.slug or v.name for v in fr_female))}.",
        f"`search(query=\"marie\")` returns {len(query_marie)}: "
        f"{', '.join(sorted(v.slug or v.name for v in query_marie))}.",
        "",
        "## Decathlon reference voices",
        "",
        "From `AGENT_VOICES` in `decathlon-reference/agents.py` (and its fallback `en_paul_excited`). "
        "\"Synth\" columns: a one-word `wav` request with that `voice_id`.",
        "",
        f"| Agent | Lang | voice_id | Listed | `voices.get` | Synth {MODELS[0]} | Synth {MODELS[1]} |",
        "|---|---|---|---|---|---|---|",
        *(f"| {' | '.join(cell(c) for c in row)} |" for row in decathlon_rows),
        "",
        "## All voices",
        "",
        "The last two columns: does a one-word request with this voice work on that model. "
        "Failures on 2603 return 400 \"voice is not supported for speech v1\". "
        "Pass the slug (or the id for custom voices) as `voice_id`.",
        "",
        f"| slug | name | type | languages | gender | age | tags | description | id | {MODELS[0]} | {MODELS[1]} |",
        "|---|---|---|---|---|---|---|---|---|---|---|",
        *(
            f"| {cell(v.slug)} | {cell(v.name)} | {cell(v.type)} | {cell(v.languages)} | "
            f"{cell(v.gender)} | {cell(v.age)} | {cell(v.tags)} | {cell(v.description)} | `{v.id}` | "
            f"{' | '.join(compat_by_id[v.id])} |"
            for v in voices
        ),
        "",
    ]
    (SPIKE_DIR / "voices.md").write_text("\n".join(lines))
    print(f"wrote voices.md with {len(voices)} voices")


if __name__ == "__main__":
    main()
