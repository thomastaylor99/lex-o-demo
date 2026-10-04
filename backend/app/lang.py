"""Languages the demo speaks."""

from typing import Literal

Language = Literal["en", "fr"]
LANGUAGES: tuple[Language, ...] = ("en", "fr")
LANGUAGE_NAMES: dict[Language, str] = {"en": "English", "fr": "French"}
