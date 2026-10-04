"""Shared helpers for the realtime STT spike: paths, clip definitions, PCM and scoring utilities.

Audio lives in /tmp/rtstt only. Nothing here writes audio into the repo.
"""

from __future__ import annotations

import os
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[2]
WORK_DIR = Path("/tmp/rtstt")
CLIPS_DIR = WORK_DIR / "clips"
RESULTS_DIR = WORK_DIR / "results"

SAMPLE_RATE = 16_000
BYTES_PER_SAMPLE = 2
CHUNK_MS = 100
CHUNK_BYTES = SAMPLE_RATE * BYTES_PER_SAMPLE * CHUNK_MS // 1000  # 3200

TTS_MODEL = "voxtral-mini-tts-2603"
EN_VOICE = "gb_jane_neutral"
FR_VOICE = "fr_marie_neutral"

MODELS = [
    "voxtral-transcribe-realtime-3",
    "voxtral-mini-transcribe-realtime-2602",
    "voxtral-mini-realtime-latest",
]

CONTEXT_BIAS = [
    "La Roche-Posay",
    "Toleriane",
    "CeraVe",
    "Kiehl's",
    "Vichy",
    "Minéral 89",
    "Lancôme",
    "Hydra Zen",
    "Garnier",
]
# The batch API rejects bias items with whitespace or commas; realtime accepts both forms.
SINGLE_WORD_BIAS = [
    "Roche-Posay",
    "Toleriane",
    "CeraVe",
    "Kiehl's",
    "Vichy",
    "Minéral",
    "Lancôme",
    "Hydra",
    "Zen",
    "Garnier",
]


@dataclass(frozen=True)
class Clip:
    name: str
    text: str
    voice: str
    language: str
    terms: tuple[str, ...]


CLIPS = [
    Clip(
        "EN1",
        "Hi, I'm looking for a moisturiser, my skin feels tight and a bit sensitive.",
        EN_VOICE,
        "en",
        ("moisturiser", "sensitive"),
    ),
    Clip(
        "EN2",
        "Is La Roche-Posay Toleriane Double Repair richer than CeraVe Moisturising Cream "
        "or Kiehl's Ultra Facial Cream?",
        EN_VOICE,
        "en",
        ("La Roche-Posay", "Toleriane", "Double Repair", "CeraVe", "Kiehl's", "Ultra Facial Cream"),
    ),
    Clip(
        "FR1",
        "Est-ce que la crème Vichy Minéral 89 convient aux peaux sensibles ?",
        FR_VOICE,
        "fr",
        ("Vichy", "Minéral 89", "peaux sensibles"),
    ),
    Clip(
        "FR2",
        "Je préfère Lancôme Hydra Zen, ou alors Garnier Hyaluronic Aloe.",
        FR_VOICE,
        "fr",
        ("Lancôme", "Hydra Zen", "Garnier", "Hyaluronic Aloe"),
    ),
]
CLIPS_BY_NAME = {clip.name: clip for clip in CLIPS}

SWITCH_NAME = "SWITCH"
SWITCH_PARTS = ("EN1", "FR1")
SWITCH_GAP_S = 1.0


def load_api_key() -> str:
    """Load MISTRAL_API_KEY from the repo .env without echoing it."""
    load_dotenv(REPO_ROOT / ".env")
    key = os.environ.get("MISTRAL_API_KEY", "")
    if not key:
        raise SystemExit("MISTRAL_API_KEY missing from .env")
    return key


def clip_path(name: str) -> Path:
    return CLIPS_DIR / f"{name}.pcm"


def read_pcm(name: str) -> bytes:
    return clip_path(name).read_bytes()


def pcm_seconds(pcm: bytes) -> float:
    return len(pcm) / (SAMPLE_RATE * BYTES_PER_SAMPLE)


def silence(seconds: float) -> bytes:
    return np.zeros(round(seconds * SAMPLE_RATE), dtype="<i2").tobytes()


# --------------------------------------------------------------------------- scoring


def _fold(text: str) -> str:
    """Lowercase, strip accents, turn hyphens and apostrophes into nothing or spaces, collapse spaces."""
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.lower().replace("’", "'")
    text = re.sub(r"\bmoisturiz", "moisturis", text)  # US spelling is not an error
    text = re.sub(r"[\-]", " ", text)
    text = text.replace("'", "")
    text = re.sub(r"[^\w\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def term_hits(transcript: str, terms: tuple[str, ...]) -> dict[str, str]:
    """For each term: 'exact' (case-insensitive substring), 'loose' (accents/punctuation folded) or 'miss'."""
    lowered = transcript.lower().replace("’", "'")
    folded = f" {_fold(transcript)} "
    hits: dict[str, str] = {}
    for term in terms:
        if term.lower() in lowered:
            hits[term] = "exact"
        elif f" {_fold(term)} " in folded:
            hits[term] = "loose"
        else:
            hits[term] = "miss"
    return hits


def wer(reference: str, hypothesis: str) -> float:
    """Word error rate on folded text (case, accents and punctuation ignored)."""
    ref = _fold(reference).split()
    hyp = _fold(hypothesis).split()
    if not ref:
        return 0.0 if not hyp else 1.0
    prev = list(range(len(hyp) + 1))
    for i, r in enumerate(ref, start=1):
        cur = [i] + [0] * len(hyp)
        for j, h in enumerate(hyp, start=1):
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (r != h))
        prev = cur
    return prev[-1] / len(ref)
