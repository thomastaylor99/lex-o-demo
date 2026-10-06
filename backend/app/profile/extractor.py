"""Profile extractor (spec 002, T12): a turn observer that reads one exchange and fills the
visitor's beauty profile in the background. Schema and prompt follow the chat-engine spike
(`spikes/2026-10-04-chat-engine/README.md`, "Profile extraction", gotchas 10 and 11): every
field is required but nullable, and the field guide lives in the prompt because the model
never sees `Field` descriptions.
"""

from collections.abc import Awaitable, Callable
from dataclasses import dataclass

import structlog
from mistralai.client import Mistral
from pydantic import BaseModel

from app.catalogue.models import Concern, SkinType, TexturePreference
from app.conversation.agent import Observer, UiEvent
from app.conversation.session import Session
from app.profile.models import (
    AgeRange,
    BudgetBand,
    HairType,
    ProductFeedback,
    ProfileUpdate,
    RoutineSize,
    Verdict,
    merge,
)
from app.usage.meter import TokenUsage

log = structlog.get_logger()


class FeedbackExtraction(BaseModel):
    """One product the visitor uses or used. Required but nullable, as below."""

    brand: str | None
    product: str | None
    verdict: Verdict | None
    reason: str | None


class ProfileExtraction(BaseModel):
    """What one exchange states about the visitor. Every field is required but nullable
    (no defaults): a schema with defaults leaves fields out of ``required`` and the model
    then skips them and never comes back to them.
    """

    first_name: str | None
    skin_type: SkinType | None
    concerns: list[Concern]
    sensitive: bool | None
    texture_preference: TexturePreference | None
    budget_max_eur: float | None
    routine_size: RoutineSize | None
    fragrance_free: bool | None
    hair_type: HairType | None
    hair_concerns: list[Concern]
    age_years: int | None
    product_feedback: list[FeedbackExtraction]


EXTRACTOR_PROMPT = """\
You extract a beauty profile from one exchange between a skincare adviser and a visitor.
Fill only what the visitor's own words state or clearly imply; the adviser's question is
context, never a source. Everything else is null, or an empty list.
budget_max_eur: the most the visitor wants to spend on one product, in euros.
routine_size: minimal (one to three products), standard (four or five), full (six or more).
texture_preference: rich or light. The visitor may speak English or French.

Fields and their allowed values:
- first_name: the visitor's own first name. Null unless they give it.
- skin_type: dry (feels tight, rough or flaky by the end of the day), oily (shiny all over),
  combination (shiny on the forehead and nose, comfortable elsewhere), normal (comfortable).
  Null if not stated.
- concerns: concerns the visitor names in their own words, only from hydration (they say
  their skin lacks moisture or feels dehydrated), sensitivity, first_signs_of_ageing,
  firmness_wrinkles, radiance, blemish_prone. The product they ask for is never a concern:
  asking for a moisturiser or a cream does not mean hydration. A feeling such as tightness
  sets skin_type, not concerns. What they say they would like to improve counts: more
  hydration is hydration, glow or dullness is radiance, fine lines are first_signs_of_ageing,
  wrinkles or firmness are firmness_wrinkles, spots or breakouts are blemish_prone. Empty list
  if none named.
- sensitive: true if the visitor says their skin reacts easily (redness, stinging, itching);
  false only if they say it does not react easily; null if they do not say either way.
- texture_preference: rich or light, stated or implied by what they say of a product they use:
  one they find too heavy, thick, rich or greasy means light; one they find too light, or not
  nourishing enough, means rich. Null if neither.
- budget_max_eur: the most the visitor wants to spend on one product, in euros, as a plain
  number. A range such as "twenty to thirty euros" is its upper end. Null if no budget is given.
- routine_size: minimal (one to three products), standard (four or five), full (six or more).
  Null if not stated.
- fragrance_free: true if the visitor wants to avoid fragrance or perfume. Null otherwise.
- hair_type: straight, wavy, curly or coily, the visitor's own hair. Null if not stated.
- hair_concerns: hair concerns the visitor wants addressed, only from dry_hair, frizz,
  damaged_hair. Empty list if none stated.
- age_years: the visitor's own age in years. For a range or a decade, its middle: "in my
  forties" is 45, "late thirties" is 38, "under thirty" is 25. Null if they do not say.
- product_feedback: each skincare or haircare product the visitor says they use or used,
  with brand (as they say it, any company; null if they do not know), product (its name or
  kind as they say it, such as "a day cream"; null if not said), verdict (liked, disliked or
  mixed; null if they give no opinion) and reason (a few of their own words, such as "too
  heavy"; null if none). Empty list if they mention no product they use.

Never fill a field from what the visitor says about someone else, such as a sister or a friend:
that is never the visitor's own profile. Never copy a value the adviser only suggested."""


@dataclass(frozen=True)
class Parsed:
    """One structured-output call: its extraction (None if the model gave none) and its usage."""

    extraction: ProfileExtraction | None
    usage: TokenUsage | None = None


Parse = Callable[[str, list[dict[str, str]]], Awaitable[Parsed]]


def to_update(extraction: ProfileExtraction) -> ProfileUpdate:
    """Map one extraction onto a ProfileUpdate, banding budget_max_eur and age_years in code:
    the JSON schema carries no description the model could read, so the band boundaries live
    here instead of in the prompt.
    """
    return ProfileUpdate(
        first_name=extraction.first_name,
        skin_type=extraction.skin_type,
        concerns=extraction.concerns,
        sensitive=extraction.sensitive,
        texture_preference=extraction.texture_preference,
        budget_band=_budget_band(extraction.budget_max_eur),
        routine_size=extraction.routine_size,
        fragrance_free=extraction.fragrance_free,
        hair_type=extraction.hair_type,
        hair_concerns=extraction.hair_concerns,
        age_range=_age_range(extraction.age_years),
        product_feedback=[
            ProductFeedback.model_validate(item.model_dump())
            for item in extraction.product_feedback
        ],
    )


def _age_range(age_years: int | None) -> AgeRange | None:
    if age_years is None or age_years <= 0:
        return None
    if age_years < 30:
        return AgeRange.UNDER_30
    if age_years < 40:
        return AgeRange.THIRTIES
    if age_years < 50:
        return AgeRange.FORTIES
    if age_years < 60:
        return AgeRange.FIFTIES
    return AgeRange.SIXTY_PLUS


def _budget_band(budget_max_eur: float | None) -> BudgetBand | None:
    if budget_max_eur is None:
        return None
    if budget_max_eur <= 20:
        return BudgetBand.UNDER_20
    if budget_max_eur <= 40:
        return BudgetBand.FROM_20_TO_40
    if budget_max_eur <= 80:
        return BudgetBand.FROM_40_TO_80
    return BudgetBand.OVER_80


def _user_message(user_text: str, previous_reply: str | None) -> str:
    adviser = previous_reply if previous_reply is not None else "(none)"
    return f"Adviser: {adviser}\nVisitor: {user_text}"


def make_profile_observer(parse: Parse, model: str) -> Observer:
    """Build the turn observer. `parse` is the structured-output call, injected so tests can
    use a fake; `mistral_parser` below builds the real one.
    """

    async def observe(
        session: Session, user_text: str, previous_reply: str | None
    ) -> list[UiEvent]:
        messages = [
            {"role": "system", "content": EXTRACTOR_PROMPT},
            {"role": "user", "content": _user_message(user_text, previous_reply)},
        ]
        try:
            parsed = await parse(model, messages)
        except Exception:
            log.exception("profile_extraction_failed", session_id=session.id, model=model)
            return []
        if parsed.usage is not None:
            session.usage.add_llm(model, parsed.usage)
        extraction = parsed.extraction
        if extraction is None:
            log.warning("profile_extraction_empty", session_id=session.id, model=model)
            return []
        session.profile = merge(session.profile, to_update(extraction))
        session.profile.language = session.language
        return [
            UiEvent(
                type="profile.updated",
                payload={"profile": session.profile.model_dump(mode="json")},
                latest=lambda: {"profile": session.profile.model_dump(mode="json")},
            )
        ]

    return observe


def mistral_parser(client: Mistral) -> Parse:
    """The real `parse`: client.chat.parse_async with temperature 0, as the chat-engine
    spike's bench_extractor.py did, returning the response's token usage with the extraction.
    """

    async def parse(model: str, messages: list[dict[str, str]]) -> Parsed:
        response = await client.chat.parse_async(
            model=model,
            messages=messages,
            response_format=ProfileExtraction,
            temperature=0,
        )
        usage = TokenUsage(response.usage.prompt_tokens or 0, response.usage.completion_tokens or 0)
        return Parsed(extraction=response.choices[0].message.parsed, usage=usage)

    return parse
