"""What the expert's reply checks share: which product a reply names, and a claim as a sentence."""

from typing import Any


def first_named(text: str, views: list[dict[str, Any]]) -> str | None:
    """The id of the product the text names first, by its full name or its first words."""
    said = plain(text)
    found: list[tuple[int, int, str]] = []  # (position, minus the length matched, id)
    for view in views:
        words = plain(view["name"]).split()
        others = [plain(other["name"]) for other in views if other is not view]
        size = 2
        while size < len(words) and any(o.startswith(" ".join(words[:size])) for o in others):
            size += 1
        for form in {" ".join(words), " ".join(words[:size])}:
            at = said.find(form)
            if at >= 0:
                found.append((at, -len(form), view["id"]))
    return min(found)[2] if found else None


def plain(text: str) -> str:
    """Lower case, straight apostrophes, hyphens as spaces, single spaces."""
    text = text.lower().replace("’", "'").replace("-", " ")
    return " ".join(text.split())


def sentence(text: str) -> str:
    text = text.strip()
    return text if text.endswith((".", "!", "?")) else f"{text}."


def full_name(view: dict[str, Any]) -> str:
    return f"{view['brand']} {view['name']}"
