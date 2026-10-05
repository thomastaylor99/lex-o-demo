"""Email addresses as visitors say them (spec 006): normalise, validate, mask and redact.

Speech to text and the model may write an address ("camille.martin@example.com") or give it in
words ("camille dot martin at example dot com", "camille point martin arobase exemple point fr").
"""

import re
import unicodedata

# Spoken words for the symbols of an address, in English and French. A word counts only when it
# stands alone, so a written address such as "jo@example.at" keeps its letters.
SYMBOLS: dict[str, str] = {
    "at": "@",
    "arobase": "@",
    "arrobase": "@",
    "dot": ".",
    "point": ".",
    "underscore": "_",
    "dash": "-",
    "hyphen": "-",
    "tiret": "-",
}
_FRENCH_UNDERSCORE = re.compile(r"\btiret\s+(?:du\s+)?bas\b")  # "tiret du bas", "tiret bas"
_PUNCTUATION = ",;:!?\"'()<>"
ADDRESS = re.compile(r"[a-z0-9_%+-]+(?:\.[a-z0-9_%+-]+)*@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}")

# Addresses inside free text, for redaction: written ones first, then spoken ones. Words match
# whole (possessive quantifiers, no start inside a word), and a spoken match may not end where
# another "at <domain>" starts: in "email me at camille dot martin at example dot com" the
# address starts at "camille", not at "me".
_WRITTEN = re.compile(r"(?<![\w.%+-])[\w.%+-]++@[\w-]++(?:\.[\w-]++)+")
_SPOKEN_SEPARATORS = r"dot|point|underscore|dash|hyphen|tiret\s+(?:du\s+)?bas|tiret"
_SEPARATOR = rf"(?:\s+(?:{_SPOKEN_SEPARATORS})\s+|\.)"
_AT = r"(?:\s*@\s*|\s+(?:at|arobase|arrobase)\s+)"
_DOT = r"(?:\s+(?:dot|point)\s+|\.)"
_SPOKEN = re.compile(
    rf"(?<![\w.%+-])[\w%+-]++(?:{_SEPARATOR}[\w%+-]++)*{_AT}[\w-]++(?:{_DOT}[\w-]++)+"
    rf"(?!{_AT}[\w-]+{_DOT})",
    re.IGNORECASE,
)


def normalise_email(text: str) -> str | None:
    """The address `text` writes or says, lowercased and without accents; None when invalid."""
    words = _FRENCH_UNDERSCORE.sub(" underscore ", _without_accents(text).lower()).split()
    parts = [_symbol(word.strip(_PUNCTUATION)) for word in words]
    address = "".join(parts).rstrip(".")
    return address if ADDRESS.fullmatch(address) else None


def mask_email(address: str) -> str:
    """Keep the first letter and the domain: c***@example.com."""
    local, _, domain = address.partition("@")
    return f"{local[:1]}***@{domain}"


def redact_emails(text: str) -> str:
    """`text` with every address in it, written or spoken, masked."""
    return _SPOKEN.sub(_mask_match, _WRITTEN.sub(_mask_match, text))


def _symbol(word: str) -> str:
    """A spoken symbol becomes the symbol; "dot." at the end of a sentence counts too."""
    return SYMBOLS.get(word.rstrip("."), word)


def _mask_match(match: re.Match[str]) -> str:
    address = normalise_email(match.group())
    return mask_email(address) if address is not None else "***"


def _without_accents(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", text)
    return "".join(char for char in decomposed if not unicodedata.combining(char))


# How the expert reads an address back, symbol by symbol.
_READ_BACK: dict[str, dict[str, str]] = {
    "en": {".": "dot", "_": "underscore", "-": "dash", "@": "at"},
    "fr": {".": "point", "_": "tiret du bas", "-": "tiret", "@": "arobase"},
}


def spell_email(address: str, language: str) -> str:
    """'camille dot martin at example dot com': the address in words, as the expert reads it back.
    Words keep the log redaction able to mask it (letter by letter would escape it)."""
    words = _READ_BACK["fr" if language == "fr" else "en"]
    return " ".join(words.get(char, char) if char in words else char for char in _symbols(address))


def _symbols(address: str) -> list[str]:
    """'camille.martin@example.com' as ['camille', '.', 'martin', '@', 'example', '.', 'com']."""
    return [part for part in re.split(r"([._@-])", address) if part]
