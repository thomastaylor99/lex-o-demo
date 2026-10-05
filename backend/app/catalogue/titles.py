"""Video titles as the screen shows them: no hashtags, no emoji, no shouting (spec 006).

Titles come word for word from the platforms (oEmbed). The screen keeps the creator's words
and drops what reads badly from a few metres away; brand names keep their own spelling.
"""

import re

HASHTAG = re.compile(r"(?<!\w)#\w+")
# Emoji, pictographs, variation selectors and joiners.
EMOJI = re.compile("[\U0001f000-\U0001faff☀-➿️‍\U0001f3fb-\U0001f3ff]")
SPACES = re.compile(r"\s+")
LOUD_WORD = re.compile(r"\b[A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ'’]{3,}\b")
KEEP_UPPER = {"SPF", "UVA", "UVB", "AM", "PM", "SPF50"}
# Brand and product names in their own spelling, restored after any change of case.
NAMES = [
    (re.compile(r"\bla roche[- ]posay\b", re.IGNORECASE), "La Roche-Posay"),
    (re.compile(r"\bl['’]or[eé]al\b", re.IGNORECASE), "L'Oréal"),
    (re.compile(r"\bcerave\b", re.IGNORECASE), "CeraVe"),
    (re.compile(r"\buvmune\b", re.IGNORECASE), "UVMune"),
    (re.compile(r"\b(spf|uva|uvb)\b", re.IGNORECASE), None),  # acronyms in capitals
    *[
        (re.compile(rf"\b{word}\b", re.IGNORECASE), word.capitalize())
        for word in ("toleriane", "anthelios", "revitalift", "elseve", "elvive")
    ],
]


def clean_title(title: str) -> str:
    """'CLEANSING LIKE A DERM USING THE CERAVE HYDRATING CLEANSER 🧼 #cerave' becomes
    'Cleansing like a derm using the CeraVe hydrating cleanser'."""
    text = SPACES.sub(" ", EMOJI.sub(" ", HASHTAG.sub(" ", title))).strip(" -|:,")
    if not text:
        return title.strip()
    letters = [c for c in text if c.isalpha()]
    shouting = letters and sum(c.isupper() for c in letters) / len(letters) > 0.6
    if shouting:
        text = text.lower()
        text = text[0].upper() + text[1:]
    else:
        text = LOUD_WORD.sub(
            lambda m: m.group(0) if m.group(0) in KEEP_UPPER else m.group(0).capitalize(), text
        )
    for pattern, name in NAMES:
        text = pattern.sub(lambda m, n=name: n or m.group(0).upper(), text)
    return text
