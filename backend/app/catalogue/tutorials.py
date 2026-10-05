"""Tutorial videos for catalogue products, from brand accounts and creators (spec 006).

Data: app/catalogue/data/tutorials.json, shaped {"tutorials": [...]}. Each link is checked by
hand, and Thomas approves the list.
"""

import json
from collections.abc import Iterable, Sequence
from datetime import date
from itertools import zip_longest
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, TypeAdapter, ValidationError

from app.catalogue.titles import clean_title
from app.lang import Language

DATA_PATH = Path(__file__).parent / "data" / "tutorials.json"
DEFAULT_LIMIT = 4


class Tutorial(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1)
    product_ids: list[str] = Field(min_length=1)
    brand: str
    platform: Literal["tiktok", "youtube", "instagram"]
    creator: str
    creator_kind: Literal["brand", "creator"]
    title: str
    url: HttpUrl
    language: Language
    verified_on: date

    def view(self) -> dict[str, Any]:
        """One item of the `tutorials.shown` event: every field but `verified_on`, with the title
        as the screen shows it (no hashtags, emoji or shouting)."""
        view = self.model_dump(mode="json", exclude={"verified_on"})
        view["title"] = clean_title(self.title)
        return view


_TUTORIALS_ADAPTER: TypeAdapter[list[Tutorial]] = TypeAdapter(list[Tutorial])


class TutorialBank:
    def __init__(self, tutorials: Iterable[Tutorial]) -> None:
        self._tutorials = list(tutorials)
        ids = [tutorial.id for tutorial in self._tutorials]
        duplicates = sorted({i for i in ids if ids.count(i) > 1})
        if duplicates:
            raise ValueError(f"duplicate tutorial ids: {', '.join(duplicates)}")

    @classmethod
    def load(cls, path: Path = DATA_PATH) -> TutorialBank:
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise ValueError(f"{path}: not valid JSON") from exc
        if not isinstance(raw, dict) or not isinstance(raw.get("tutorials"), list):
            raise ValueError(f"{path}: expected a top-level object shaped like {{'tutorials': []}}")
        try:
            return cls(_TUTORIALS_ADAPTER.validate_python(raw["tutorials"]))
        except ValidationError as exc:
            raise ValueError(f"{path}: invalid tutorial: {exc}") from exc

    def all(self) -> list[Tutorial]:
        return list(self._tutorials)

    def select(
        self, product_ids: Sequence[str], language: Language, limit: int = DEFAULT_LIMIT
    ) -> list[Tutorial]:
        """The most relevant tutorials for these products, at most `limit`, each once.

        Products take turns in the given order: each one's best entry, then each one's second,
        and so on. A product's best entries are those in the session language, in file order.
        When the picks all come from brands, or all from creators, the last one gives way to an
        entry of the other kind, for the same product when there is one. The session language
        comes first in the result, the other language after.
        """
        wanted = list(dict.fromkeys(product_ids))
        queues = [
            sorted(
                (t for t in self._tutorials if product_id in t.product_ids),
                key=lambda t: t.language != language,
            )
            for product_id in wanted
        ]
        turns = (t for row in zip_longest(*queues) for t in row if t is not None)
        ranked = list({t.id: t for t in turns}.values())
        picked = ranked[:limit]
        if len(picked) > 1 and len({t.creator_kind for t in picked}) == 1:
            picked[-1] = _other_kind(picked[-1], ranked[limit:], set(wanted)) or picked[-1]
        return sorted(picked, key=lambda t: t.language != language)


def _other_kind(last: Tutorial, spares: list[Tutorial], wanted: set[str]) -> Tutorial | None:
    """The best spare of the other kind, for one of the same products when there is one."""
    others = [t for t in spares if t.creator_kind != last.creator_kind]
    shared = set(last.product_ids) & wanted
    return next((t for t in others if shared & set(t.product_ids)), next(iter(others), None))
