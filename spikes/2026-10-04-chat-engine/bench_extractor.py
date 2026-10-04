"""Step 6: structured profile extraction with chat.parse_async, ministral-8b-latest against
mistral-small-latest. Each exchange (advisor question plus visitor reply) is extracted on its
own; the app would merge the non-null fields into the running profile. 5 interleaved runs per
model, exchange and schema variant, default sampling (0.3 for both models). Fields are scored
against expected values; a value the visitor never stated counts as a hallucination.

Variants, same fields, types and descriptions:
  optional         every field has a default of None, so it is absent from "required" (Pydantic default)
  required         every field is required but nullable: the model must write each key, null or a value
  required_guided  required, plus a field guide in the system prompt. The JSON schema adds no prompt
                   tokens (checked: 152 prompt tokens with or without it), so the model never sees
                   the Field descriptions; the guide is the only way to tell it what values mean.
"""

from __future__ import annotations

import asyncio
import time
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from typing import Any, Literal

from pydantic import BaseModel, Field, create_model

from common import RETRYABLE, api_error, make_client, median, ms, p90, pause, write_json

MODELS = ["ministral-8b-latest", "mistral-small-latest"]
RUNS = 5

Concern = Literal["dryness", "dehydration", "redness", "sensitivity", "dullness", "blemishes", "dark_spots", "fine_lines", "large_pores", "oiliness"]
HairConcern = Literal["frizz", "dryness", "damage", "breakage", "hair_loss", "dandruff", "oily_scalp", "colour_care", "volume"]


FIELDS: dict[str, tuple[Any, str]] = {
    "skin_type": (Literal["dry", "oily", "combination", "normal"] | None, "The visitor's own skin type."),
    "concerns": (list[Concern] | None, "Skin concerns the visitor wants to address."),
    "sensitive": (bool | None, "True if the visitor says their skin reacts easily, false only if they say it does not."),
    "texture_preference": (Literal["light", "rich"] | None, "Texture the visitor prefers."),
    "budget_band": (Literal["low", "mid", "high"] | None, "Price per product the visitor accepts: low under 20 euros, mid 20 to 40 euros, high over 40 euros."),
    "routine_size": (Literal["minimal", "standard", "full"] | None, "minimal is one or two products, standard three or four, full five or more."),
    "fragrance_free": (bool | None, "True if the visitor wants to avoid fragrance or perfume."),
    "hair_type": (Literal["straight", "wavy", "curly", "coily"] | None, "The visitor's own hair type."),
    "hair_concerns": (list[HairConcern] | None, "Hair concerns the visitor wants to address."),
    "language": (Literal["en", "fr"] | None, "Language the visitor speaks in this exchange."),
    "first_name": (str | None, "The visitor's first name, only if they give it."),
}


def profile_model(required: bool) -> type[BaseModel]:
    """BeautyProfile with every field optional (default None) or required-but-nullable."""
    return create_model(
        "BeautyProfile",
        **{name: (typ, Field(... if required else None, description=desc)) for name, (typ, desc) in FIELDS.items()},
    )


SCHEMAS: dict[str, type[BaseModel]] = {"optional": profile_model(required=False), "required": profile_model(required=True)}


EXTRACTOR_PROMPT = """You update a visitor's beauty profile from one exchange between a beauty advisor and the visitor.

Fill a field only with what the visitor says about themselves in this exchange. Leave every other field null. Do not guess, do not copy what the advisor suggests, and ignore what the visitor says about other people. Always set language to the language the visitor speaks."""


FIELD_GUIDE = """

Fields:
- skin_type: dry (feels tight, rough or flaky), oily (shiny all over), combination (shiny on the forehead and nose), normal (comfortable).
- concerns: skin concerns the visitor wants to address: dryness, dehydration, redness, sensitivity, dullness, blemishes, dark_spots, fine_lines, large_pores, oiliness.
- sensitive: true if their skin reacts easily (redness, stinging), false only if they say it does not.
- texture_preference: light or rich.
- budget_band: price per product the visitor accepts. low is under 20 euros, mid is 20 to 40 euros, high is over 40 euros.
- routine_size: minimal is one or two products, standard three or four, full five or more.
- fragrance_free: true if they want to avoid fragrance or perfume.
- hair_type: straight, wavy, curly or coily.
- hair_concerns: frizz, dryness, damage, breakage, hair_loss, dandruff, oily_scalp, colour_care, volume.
- language: en or fr, the language the visitor speaks.
- first_name: only if the visitor gives it."""

VARIANTS: dict[str, tuple[type[BaseModel], str]] = {
    "optional": (SCHEMAS["optional"], EXTRACTOR_PROMPT),
    "required": (SCHEMAS["required"], EXTRACTOR_PROMPT),
    "required_guided": (SCHEMAS["required"], EXTRACTOR_PROMPT + FIELD_GUIDE),
}


@dataclass
class ListSpec:
    any_of: set[str] = field(default_factory=set)  # at least one of these must be present (empty: none required)
    allowed: set[str] = field(default_factory=set)  # nothing outside this set


@dataclass
class Exchange:
    key: str
    advisor: str
    visitor: str
    expected: dict[str, Any]  # field -> set of accepted scalar values, or ListSpec; unlisted fields must be null


EXCHANGES = [
    Exchange(
        "e1_en_skin",
        "Tight skin is no fun, let's get you some comfort. By the end of the day, does it feel tight all over, or does it get a little shiny on your forehead and nose?",
        "Tight all over, honestly, especially on my cheeks, and it gets flaky when it's cold. I'm Sarah, by the way.",
        {"skin_type": {"dry"}, "concerns": ListSpec({"dryness", "dehydration"}, {"dryness", "dehydration"}), "first_name": {"Sarah"}, "language": {"en"}},
    ),
    Exchange(
        "e2_en_sensitivity",
        "That sounds like dry skin asking for comfort. Does it react easily, like going red or stinging when you try a new product?",
        "Yes, it goes red really easily, so nothing with perfume please. And I hate heavy creams, I like something light.",
        {"skin_type": {None, "dry"}, "sensitive": {True}, "fragrance_free": {True}, "texture_preference": {"light"},
         "concerns": ListSpec(set(), {"redness", "sensitivity"}), "language": {"en"}},
    ),
    Exchange(
        "e3_fr_routine_hair",
        "Et côté routine, vous aimez faire simple ou vous avez plusieurs étapes ?",
        "Je préfère faire simple, deux produits maximum, et pas plus de trente euros chacun. Ah, et mes cheveux sont bouclés, ils frisottent beaucoup.",
        {"routine_size": {"minimal"}, "budget_band": {"mid"}, "hair_type": {"curly"}, "hair_concerns": ListSpec({"frizz"}, {"frizz"}), "language": {"fr"}},
    ),
    Exchange(
        "e4_en_trap",
        "The Toleriane cream is on your screen. Would you like me to add it to your basket?",
        "Not yet. My sister has really oily skin with lots of breakouts, would it work for her too?",
        {"language": {"en"}},
    ),
]


def score_field(name: str, predicted: Any, spec: Any) -> str:
    """ok | missed | wrong | hallucinated"""
    if isinstance(spec, ListSpec) or (spec is None and name in ("concerns", "hair_concerns")):
        spec = spec or ListSpec()
        got = set(predicted or [])
        if got <= spec.allowed and (not spec.any_of or got & spec.any_of):
            return "ok"
        if not got:
            return "missed"
        return "hallucinated" if not spec.allowed else "wrong"
    accepted = spec if spec is not None else {None}
    if predicted in accepted:
        return "ok"
    if predicted is None:
        return "missed"
    return "hallucinated" if accepted == {None} else "wrong"


async def extract(client: Any, model: str, ex: Exchange, schema: type[BaseModel], prompt: str) -> dict[str, Any]:
    messages = [
        {"role": "system", "content": prompt},
        {"role": "user", "content": f"Advisor: {ex.advisor}\nVisitor: {ex.visitor}"},
    ]
    retried = 0
    for attempt in range(4):
        t0 = time.perf_counter()
        try:
            resp = await client.chat.parse_async(response_format=schema, model=model, messages=messages)
        except Exception as exc:  # noqa: BLE001 - SDK, JSON and validation errors are all findings here
            err = api_error(exc)
            if err.get("status") in RETRYABLE:
                retried += 1
                await asyncio.sleep(1.5 * (attempt + 1))
                continue
            return {"error": err, "latency": time.perf_counter() - t0, "retried": retried}
        latency = time.perf_counter() - t0
        values = resp.choices[0].message.parsed.model_dump()
        scores = {name: score_field(name, values[name], ex.expected.get(name)) for name in FIELDS}
        return {"latency": latency, "values": values, "scores": scores, "retried": retried, "raw": resp.choices[0].message.content,
                "prompt_tokens": resp.usage.prompt_tokens, "completion_tokens": resp.usage.completion_tokens, "model_reported": resp.model}
    return {"error": {"status": "retries exhausted"}, "latency": None, "retried": retried}


async def main() -> None:
    runs: dict[tuple[str, str, str], list[dict[str, Any]]] = defaultdict(list)
    async with make_client() as client:
        for model in MODELS:  # warm-up
            for schema, prompt in VARIANTS.values():
                await extract(client, model, EXCHANGES[0], schema, prompt)
        for round_no in range(RUNS):
            for ex in EXCHANGES:
                for model in MODELS:
                    for variant, (schema, prompt) in VARIANTS.items():
                        r = await extract(client, model, ex, schema, prompt)
                        runs[(model, variant, ex.key)].append(r)
                        if "error" in r:
                            print(f"r{round_no} {model:22} {variant:8} {ex.key:20} ERROR {r['error']}")
                        else:
                            bad = {k: (v, r["values"][k]) for k, v in r["scores"].items() if v != "ok"}
                            print(f"r{round_no} {model:22} {variant:8} {ex.key:20} {ms(r['latency']):>5} ms  not ok: {bad or '-'}")
                        await pause(0.2)
    summary: dict[str, Any] = {}
    for model in MODELS:
        for variant in VARIANTS:
            rs = [r for ex in EXCHANGES for r in runs[(model, variant, ex.key)]]
            ok = [r for r in rs if "error" not in r]
            lat = [r["latency"] for r in ok]
            outcomes = Counter(v for r in ok for v in r["scores"].values())
            problems: Counter[str] = Counter()
            for ex in EXCHANGES:
                for r in runs[(model, variant, ex.key)]:
                    if "error" in r:
                        continue
                    for f, v in r["scores"].items():
                        if v != "ok":
                            problems[f"{ex.key}.{f}: {v} -> {r['values'][f]!r}"] += 1
            summary[f"{model}/{variant}"] = {
                "calls": len(rs), "errors": len(rs) - len(ok),
                "latency_median": median(lat), "latency_p90": p90(lat),
                "per_exchange_latency_median": {ex.key: median([r["latency"] for r in runs[(model, variant, ex.key)] if "error" not in r]) for ex in EXCHANGES},
                "field_accuracy": outcomes["ok"] / sum(outcomes.values()) if outcomes else None,
                "outcomes": dict(outcomes),
                "exchanges_all_fields_ok": sum(1 for r in ok if all(v == "ok" for v in r["scores"].values())),
                "problems": dict(problems.most_common()),
                "completion_tokens_median": median([r["completion_tokens"] for r in ok]),
                "prompt_tokens_median": median([r["prompt_tokens"] for r in ok]),
                "sample_raw": ok[0]["raw"] if ok else None,
            }
    write_json("extractor_runs.json", {"/".join(k): v for k, v in runs.items()})
    write_json("extractor_summary.json", summary)
    write_json("extractor_schemas.json", {k: v.model_json_schema() for k, v in SCHEMAS.items()})
    for key, s in summary.items():
        print(f"\n{key}: latency median {ms(s['latency_median'])} ms, p90 {ms(s['latency_p90'])} ms; field accuracy {s['field_accuracy']:.1%}; "
              f"exchanges fully right {s['exchanges_all_fields_ok']}/{s['calls'] - s['errors']}; outcomes {s['outcomes']}; completion tokens {s['completion_tokens_median']}")
        for p, n in s["problems"].items():
            print(f"   {n}x {p}")


if __name__ == "__main__":
    asyncio.run(main())
