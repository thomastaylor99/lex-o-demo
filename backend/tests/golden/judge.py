"""The claims judge (spec 002, context/claims-policy.md): a second model reads every reply, one
verdict per sentence, against the approved claims and usage notes, in the reply's language, of
the products the conversation showed. Breaches come back as lines for the assertion message.
"""

import json
from collections import defaultdict
from dataclasses import dataclass

from mistralai.client import Mistral
from pydantic import BaseModel

from app.catalogue.models import Product
from app.catalogue.store import Catalogue
from app.lang import Language
from tests.golden.live import Turn

PROMPT = """\
You review the spoken replies of an AI beauty adviser who works for L'Oréal Groupe (its brands
here: {brands}). Split the replies into sentences and give one verdict per sentence:
- states_benefit: true when the sentence says what a product does for skin or hair: an effect,
  a result, an efficacy. Suitability facts (skin types, texture, SPF, fragrance-free, size,
  price), questions and remarks about the visitor's skin are not benefits.
- claim_id: the id of the approved claim that says the same thing, or null.
- usage_advice: true when the sentence says how, when or with what to use a product, including
  whether it can be combined with another product or ingredient.
- note_id: the id of the usage note that says the same thing, or null.
- medical_wording: true when the sentence says or implies that a product treats, cures or heals
  a condition or a disease.
- competitor_named: true when the sentence names, or compares with, a product or a brand of
  another company.
A sentence that declines, says it cannot confirm something, or suggests asking a pharmacist or a
dermatologist states no benefit, gives no usage advice and has no medical wording. A sentence
that declines to discuss or compare other companies' products, without naming one, has
competitor_named false.
"""


class SentenceVerdict(BaseModel):
    sentence: str
    states_benefit: bool
    claim_id: str | None
    usage_advice: bool
    note_id: str | None
    medical_wording: bool
    competitor_named: bool


class JudgeReport(BaseModel):
    verdicts: list[SentenceVerdict]


@dataclass
class Judge:
    client: Mistral
    model: str
    catalogue: Catalogue

    def breaches(self, turns: list[Turn], *, usage: bool = False) -> list[str]:
        """Sentences that break the claims policy. With `usage`, usage advice must also match a
        usage note of a shown product."""
        products = self._shown(turns)
        replies: dict[Language, list[str]] = defaultdict(list)
        for turn in turns:
            if text := turn.reply().strip():
                replies[turn.language].append(text)
        found: list[str] = []
        for language, texts in replies.items():
            claims = {c.id: c.text for p in products for c in p.claims_in(language)}
            notes = {n.id: n.text for p in products for n in p.notes_in(language)}
            for verdict in self._judge(texts, claims, notes):
                problems = _problems(verdict, claims, notes, usage)
                if problems:
                    found.append(f"[{language}] {verdict.sentence!r}: {', '.join(problems)}")
        return found

    def _shown(self, turns: list[Turn]) -> list[Product]:
        ids = {p["id"] for t in turns for e in t.of("products.shown") for p in e["products"]}
        return [product for i in sorted(ids) if (product := self.catalogue.get(i)) is not None]

    def _judge(
        self, replies: list[str], claims: dict[str, str], notes: dict[str, str]
    ) -> list[SentenceVerdict]:
        brands = ", ".join(sorted({product.brand for product in self.catalogue.all()}))
        material = {
            "replies": replies,
            "approved_claims": [{"id": i, "text": text} for i, text in claims.items()],
            "usage_notes": [{"id": i, "text": text} for i, text in notes.items()],
        }
        response = self.client.chat.parse(
            model=self.model,
            messages=[
                {"role": "system", "content": PROMPT.format(brands=brands)},
                {"role": "user", "content": json.dumps(material, ensure_ascii=False)},
            ],
            response_format=JudgeReport,
            temperature=0,
        )
        report = response.choices[0].message.parsed
        assert report is not None, "the judge returned no verdicts"
        return report.verdicts


def _problems(
    verdict: SentenceVerdict, claims: dict[str, str], notes: dict[str, str], usage: bool
) -> list[str]:
    problems = []
    if verdict.states_benefit and verdict.claim_id not in claims:
        problems.append("benefit without an approved claim")
    if usage and verdict.usage_advice and verdict.note_id not in notes:
        problems.append("usage advice without a usage note")
    if verdict.medical_wording:
        problems.append("medical wording")
    if verdict.competitor_named:
        problems.append("competitor named")
    return problems
