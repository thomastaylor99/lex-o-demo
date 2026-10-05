"""The recap written by a Mistral model from the session's facts (spec 006).

Structured output (subject, body) through client.chat.parse_async, called as the profile
extractor calls it. The tool gives the writer a time budget, checks what it wrote
(app/recap/check.py) and falls back to the template.
"""

import json
import re
from collections.abc import Awaitable, Callable
from dataclasses import dataclass

from mistralai.client import Mistral
from pydantic import BaseModel

from app.lang import LANGUAGE_NAMES
from app.recap.facts import RecapFacts
from app.recap.words import long_date
from app.usage.meter import TokenUsage

SUBJECT_MAX_CHARS = 60
BODY_MAX_WORDS = 120
TEMPERATURE = 0.3
MAX_TOKENS = 500  # about three times a 120-word body: a runaway answer fails, then the template
# Left out of what the model reads: usage notes would not fit in 120 words, and quotation marks
# around a tutorial title would look like a claim.
NOT_FOR_THE_MODEL = {"products": {"__all__": {"usage_note"}}, "tutorials": {"__all__": {"title"}}}

WRITER_PROMPT = """\
You write the recap email a visitor receives after a skincare discovery with L'Oréal's AI
skincare expert. The user message names the language and gives the facts as JSON. Write the
subject and the body in that language.

subject: at most 60 characters, with the visitor's first name when it is known.

body: plain text, at most 120 words, in short paragraphs separated by a blank line, in this order:
1. A greeting with the visitor's first name.
2. One sentence that recalls their skin and preferences, from the facts.
3. One paragraph per product, in the order given: its brand and name, then its fit sentence,
   then its approved claim between quotation marks.
4. One sentence naming the tutorials by creator and platform.
5. The in-store offer: its label, its code and the date it is valid until.

Copy every fit sentence and every claim exactly, character for character: never shorten,
translate, merge or rephrase them. Quotation marks hold the claims and nothing else. The first
product always keeps its claim; when the body would run over 120 words, leave out the claims of
the last products first.

Write nothing else about what a product does: no other benefits or results, no medical words
such as treat, cure or heal, no other companies or their products, no prices, no markdown.
Leave out any fact that is null."""


class Recap(BaseModel):
    subject: str
    body: str


@dataclass(frozen=True)
class Written:
    """A recap and the token usage of the call that wrote it."""

    recap: Recap
    usage: TokenUsage | None = None


Writer = Callable[[RecapFacts], Awaitable[Written]]


def mistral_writer(client: Mistral, model: str) -> Writer:
    async def write(facts: RecapFacts) -> Written:
        response = await client.chat.parse_async(
            model=model,
            messages=[
                {"role": "system", "content": WRITER_PROMPT},
                {"role": "user", "content": _user_message(facts)},
            ],
            response_format=Recap,
            temperature=TEMPERATURE,
            max_tokens=MAX_TOKENS,
        )
        usage = TokenUsage(response.usage.prompt_tokens or 0, response.usage.completion_tokens or 0)
        recap = response.choices[0].message.parsed
        if recap is None or not recap.subject.strip() or not recap.body.strip():
            raise ValueError("the recap model returned no subject or no body")
        tidied = Recap(subject=clip_subject(recap.subject), body=_tidy(recap.body))
        return Written(recap=tidied, usage=usage)

    return write


def clip_subject(subject: str) -> str:
    """One line of at most 60 characters, cut at a word when it is longer."""
    line = " ".join(subject.split())
    if len(line) <= SUBJECT_MAX_CHARS:
        return line
    cut = line[: SUBJECT_MAX_CHARS + 1].rsplit(" ", 1)[0]
    return (cut if len(cut) <= SUBJECT_MAX_CHARS else line[:SUBJECT_MAX_CHARS]).rstrip(" ,;:-")


def _tidy(body: str) -> str:
    """Trimmed lines, and never more than one blank line between paragraphs."""
    lines = [line.strip() for line in body.strip().splitlines()]
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines))


def _user_message(facts: RecapFacts) -> str:
    shown = facts.model_dump(mode="json", exclude=NOT_FOR_THE_MODEL)
    shown["coupon"]["valid_until"] = long_date(facts.coupon.valid_until, facts.language)
    as_json = json.dumps(shown, ensure_ascii=False)
    return f"Language: {LANGUAGE_NAMES[facts.language]}\nFacts: {as_json}"
