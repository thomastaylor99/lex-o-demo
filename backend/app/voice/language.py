"""English or French, read from a transcript's function words and accented letters.

The realtime model sends no language event (STT spike), so the final text decides. Capitalised
words inside a sentence are names (La Roche-Posay, Lancôme) and say nothing about the language.
"""

import re

from app.lang import Language

MIN_WORDS = 2

ENGLISH = frozenset(
    """
    i i'm i'd i've i'll you you're your yours he she it it's its we we're our they they're their
    them the and or is isn't are aren't am was were be been do does doesn't don't did didn't have
    has had can can't could would should will won't what what's which who how why where when that
    that's this these those there here for with without of to in at from by about around into than
    then not no yes please thanks thank hi hello hey looking something anything some any much many
    very too also just like want need if so because my skin ten twenty thirty forty fifty sixty
    hundred
    """.split()
)
FRENCH = frozenset(
    """
    je tu il elle nous vous ils elles moi toi lui le la les un une des du de au aux et est sont suis
    ou mais donc pour avec sans dans sur sous chez par vers entre pas ne que qui quoi quel quelle
    quels quelles pourquoi combien ce cette cet ces mon ma mes tes son sa ses votre vos notre nos
    leur leurs y en oui merci bonjour bonsoir salut aussi bien peu beaucoup trop moins environ alors
    sinon si cherche voudrais veux peux aimerais faut peau peaux visage dix vingt trente quarante
    cinquante soixante cent
    """.split()
)
FRENCH_ELISIONS = frozenset("c d j l m n qu s t jusqu lorsqu puisqu".split())
FRENCH_LETTERS = frozenset("àâæçéèêëîïôœùûüÿ")
ENGLISH_I = frozenset({"i", "i'm", "i'd", "i've", "i'll"})
SENTENCE_ENDS = frozenset(".!?…")

_TOKENS = re.compile(r"[.!?…]|[^\W\d_]+(?:'[^\W\d_]+)*")


def detect(text: str, default: Language) -> Language:
    """The language with more signals; `default` when the text is too short or the scores tie."""
    words = _words(text)
    if len(words) < MIN_WORDS:
        return default
    french = english = 0
    for word, opens_sentence in words:
        lower = word.lower()
        if word[0].isupper() and not opens_sentence and lower not in ENGLISH_I:
            continue
        if lower in ENGLISH:
            english += 1
        elif lower in FRENCH or _elided(lower) or not FRENCH_LETTERS.isdisjoint(lower):
            french += 1
    if french == english:
        return default
    return "fr" if french > english else "en"


def _elided(word: str) -> bool:
    """French elision such as d'environ, c'est, qu'il."""
    head, apostrophe, _ = word.partition("'")
    return bool(apostrophe) and head in FRENCH_ELISIONS


def _words(text: str) -> list[tuple[str, bool]]:
    """Each word, and whether it opens a sentence."""
    words: list[tuple[str, bool]] = []
    opens = True
    for match in _TOKENS.finditer(text.replace("’", "'")):
        token = match.group()
        if token in SENTENCE_ENDS:
            opens = True
        else:
            words.append((token, opens))
            opens = False
    return words
