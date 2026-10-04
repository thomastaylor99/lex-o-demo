"""Which models exist for this key, what each alias points to, and what they support."""

from __future__ import annotations

import asyncio

from common import api_error, make_client, write_json

MODELS = [
    "mistral-small-latest",
    "ministral-14b-latest",
    "mistral-medium-latest",
    "ministral-8b-latest",
]


async def main() -> None:
    out = {}
    async with make_client() as client:
        for model_id in MODELS:
            try:
                card = await client.models.retrieve_async(model_id=model_id)
            except Exception as exc:  # noqa: BLE001 - spike: report whatever fails
                out[model_id] = {"error": api_error(exc)}
                print(model_id, "ERROR", out[model_id])
                continue
            d = card.model_dump(mode="json")
            keep = {k: d.get(k) for k in ("id", "name", "aliases", "capabilities", "max_context_length", "deprecation", "default_model_temperature", "created")}
            out[model_id] = keep
            print(model_id, "->", keep["id"], "| aliases:", keep["aliases"])
            print("   capabilities:", keep["capabilities"])
            print("   max_context:", keep["max_context_length"], "| default temp:", keep.get("default_model_temperature"), "| deprecation:", keep["deprecation"])
    write_json("models.json", out)


if __name__ == "__main__":
    asyncio.run(main())
