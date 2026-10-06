# 002 Discovery

> Status: approved 2026-10-04. Owner: Thomas. Last updated: 2026-10-05.

## Goal

The skincare journey of the demo. A beauty concierge hands the visitor to a skincare expert, who diagnoses, recommends real L'Oréal Groupe products using approved claims only, builds a routine, suggests one haircare product and closes with a beauty profile the visitor agrees to save. It answers three questions the room will ask: can voice carry discovery to purchase in one conversation (the third pillar of L'Oréal's Chief AI Officer), does it stay defensible, and what does a brand get from it (a bigger basket and a consented profile). Background: `context/brief.md`, `context/claims-policy.md`.

## Success criteria

- Golden conversations pass (marker `golden`, live API): the English golden path, an English to French switch, the eczema question, the retinol question, a competitor brand.
- In every golden conversation, a judge model finds that each sentence stating a product benefit matches an approved claim, in the session language, of a product returned in that conversation.
- The golden path ends with a basket of at least three products from at least two divisions, and a profile holding skin type, concern, sensitivity, texture, budget band, hair concern and consent.
- Catalogue validation passes: about 12 products, each with at least one approved claim and one usage note in English and in French, every claim with its source URL and date, a price with its source, pairings that point to existing products.

## Scope

In scope (V0): the concierge and skincare agents, their instructions (in English, with the reply language set per turn) and fixed lines (in English and French), five tools, the catalogue schema and data, the beauty profile and its extractor, claims enforcement, golden conversations.

Out of scope: the haircare expert and any third specialist (V1, same mechanism); contact details and a recap email (V1 decision); creators and brand-ambassador voices (L'Oréal's rule on synthetic people, AI Act Article 50); ratings and reviews.

## Journey

1. Welcome: the concierge's fixed line asks what the visitor is looking for.
2. Handover: the concierge's model call is forced to `transfer_to_agent`; its handover line plays while the skincare expert's first reply streams.
3. Diagnosis: the same five topics, in the same order, before any product: skin type, redness, the moisturiser they use now and how they find it, texture, then age range (optional). One question per turn, worded by the model from the visitor's words; a topic the visitor already answered is skipped, so it usually takes three or four turns. The main concern comes from the visitor's first sentence. See Diagnosis below.
4. Recommendation: one best match and up to two alternatives; one spoken reason tied to the visitor's words and one approved claim. Prices and details stay on screen. The product the expert presents first is always the one the screen marks "Top pick": the search result names it `top_pick`, and a reply in the search's turn that presents another product first, or none by name, gives way to the top pick's fixed presentation (its full name, its fit line, an approved claim word for word) (Thomas, 2026-10-06).
5. Choice: the chosen products go into the basket.
6. Routine: the expert completes the routine around the cream with catalogue pairings (cleanser, serum, sunscreen).
7. Cross-sell: one question about hair, one haircare suggestion.
8. Close: the expert asks to save the profile and routine. Yes keeps them for the session; no discards the profile. A two-sentence recap ends the conversation.

At any turn the visitor may switch language: the reply follows, with the claims of that language.

## Agents

**Concierge.** Speaks only fixed lines, in English and French: `welcome`, `clarify`, `handover_skincare`. It introduces itself as L'Oréal's AI beauty concierge. Its model call is forced to `transfer_to_agent(agent, summary)` with `agent` in `skincare`, `unclear`. On `unclear` the tool ends the turn with the `clarify` line; a second `unclear` goes to skincare in V0. On `skincare` the tool asks for the `handover_skincare` line and the switch.

**Skincare expert.** Introduces itself as an AI skincare expert and picks up the concierge's summary. Fixed line: `filler_search`, in English and French, listed in its `tool_fillers` for `search_products` and `get_routine`. Prompt rules: two or three short sentences, nothing read from the screen (`context/voice-lessons.md`); claims rules 2 to 4 of `context/claims-policy.md`; reply in the language named in the context block; never name a competitor; no medical wording, and for medical questions suggest a pharmacist or dermatologist. The diagnosis decides its tools until the first search: none while a topic is open, then `search_products` forced in the turn the diagnosis completes. If six expert turns pass without a search (the five questions and one asked again), the loop forces `search_products` on the next call.

## Tools

| Tool | Agent | Arguments | Returns |
|---|---|---|---|
| `transfer_to_agent` | concierge | `agent`, `summary` | confirmation; the loop switches agent |
| `search_products` | skincare | `category` (required); `skin_type`, `concerns`, `sensitive`, `texture`, `max_price_eur`, `fragrance_free`, `spf_needed` (optional) | up to three products, best match first, with claims and usage notes in the session language; emits `products.shown` |
| `get_routine` | skincare | `product_id` | the paired products by routine step, with claims and usage notes; emits `products.shown` |
| `add_to_basket` | skincare | `product_ids` | basket items and total; emits `basket.updated` |
| `save_profile` | skincare | `consent`, `first_name` (optional) | profile kept or discarded, and a summary; emits `profile.updated` |

Ranking is plain code: points for skin type, each matching concern, texture and fragrance-free; products unsuitable for sensitive skin are dropped when `sensitive` is true; products above `max_price_eur` are dropped; ties go to the price closest to the budget. Results only include products that have claims in the session language. Tool results never carry internal scores.

## Catalogue schema

`backend/app/catalogue/models.py`, data in `backend/app/catalogue/data/products.json`.

| Field | Type | Note |
|---|---|---|
| `id` | str | slug, e.g. `lrp-toleriane-double-repair` |
| `brand`, `division` | str, enum | division: `consumer_products`, `luxe`, `dermatological_beauty`, `professional_products` |
| `name`, `url` | `{en, fr}` | UK page and French page of the same product |
| `category`, `routine_step` | enum | `moisturiser`, `cleanser`, `serum`, `sunscreen`, `eye_care`, `haircare`; `cleanse`, `treat`, `moisturise`, `protect`, `hair` |
| `skin_types`, `concerns` | list of enums | concerns cover skin and hair (`hydration`, `sensitivity`, `first_signs_of_ageing`, `firmness_wrinkles`, `radiance`, `blemish_prone`, `dry_hair`, `frizz`) |
| `suitable_for_sensitive`, `fragrance_free` | bool, bool or null | null when the page does not say |
| `texture`, `spf`, `size_ml` | enum, int or null, number | |
| `price_eur`, `price_source_url` | decimal, URL | brand's French page, or the French retailer named in `perimeter.md` |
| `approved_claims`, `usage_notes` | list of `{id, lang, text, source_url, copied_on}` | quoted word for word from the brand page in that language |
| `pairs_with` | list of product ids | basis for `get_routine` |

## Beauty profile

Fields, all optional until filled: `language`, `first_name`, `skin_type`, `concerns`, `sensitive`, `texture_preference`, `budget_band` (`under_20`, `20_to_40`, `40_to_80`, `over_80`), `routine_size` (`minimal`, `standard`, `full`), `fragrance_free`, `hair_type`, `hair_concerns`, `age_range` (`under_30`, `30s`, `40s`, `50s`, `60_plus`), `product_feedback` (each product the visitor uses or used: `brand` as said, any company; `product`; `verdict` `liked`, `disliked` or `mixed`; `reason` in their words), `consent` (`pending`, `given`, `declined`). Basket items come only from `add_to_basket`. The expert never discusses another company's product aloud: when the visitor says they use one, it thanks them and moves on.

The extractor runs after each final transcript, beside the turn: `mistral-small-latest` with structured output (every field required and nullable, the field guide in its prompt, budget read in euros and the age in years, both banded in code) reads the last agent message and the visitor's reply, returns only what the visitor's words support, and the result merges into the session profile. `profile.updated` goes out before `turn.done`. The profile lives in memory and disappears with the session or on a "no" at the close.

## Perimeter

Thomas narrowed it on 2026-10-04 to two or three brands, about 12 products: L'Oréal Paris (Consumer Products: three face moisturisers, one serum, two Elseve haircare products for the cross-sell), CeraVe (Dermatological Beauty: three face moisturisers including one with SPF, two cleansers), and La Roche-Posay only where a product clearly needs it, such as a sunscreen (two at most). Coverage: dry, normal, combination and oily skin; hydration, sensitivity, first signs of ageing, radiance; rich and light textures; at least one day cream with SPF; at least two fragrance-free products. A research subagent drafts the shortlist into `specs/002-discovery/perimeter.md`; Thomas approves it before claims are copied from public brand pages only (NDA unsigned as of 2026-10-03).

## Diagnosis

Thomas, 2026-10-05: the expert asks the same questions, in the same order, every time, and recommends only after the last answer. `backend/app/agents/diagnosis.py` keeps the state per session; `backend/app/agents/skincare.py` reads it for the tool choice and the context block.

- Topics, in order: skin type (how the skin usually feels: dry, oily, combination or normal), redness (whether it reddens, stings or reacts when a cream goes on), the current product (which moisturiser they use and how they find it: product feedback for the brands' marketing teams, asked before texture since "too heavy" answers both), texture (light or rich), age range (asked as optional; a decade is enough). Gender is neither asked nor inferred: the 13 products are unisex, and a guess from a voice can go wrong on stage (Thomas, 2026-10-05).
- A topic is answered when the visitor's words mention it (word lists in English and French), when the profile holds it (the extractor's earlier turns), or when the expert asked about it and the visitor replied with anything but a question. A question gets the topic asked again once; after that, any reply moves on.
- Each turn, the context block names the one topic to ask about, and the call carries no tools at all, so the expert cannot search early; a "let me find" said without tools forces nothing. With the tools shown and `tool_choice` "none", the model wrote the search out as text and made up a top pick, which the voice would have read.
- Before it is spoken, each diagnosis reply is checked (`AgentConfig.vet_reply`): one question of at most 60 words, on its topic (the topic's question words), naming no product, brand or tool. Otherwise the topic's fixed question replaces it, in the session language, after the introduction on the handover turn. The browser speaks and shows `text.done`, so the visitor only ever hears the replacement.
- The turn the diagnosis completes, `search_products` is forced and the context says so; the expert presents the top pick in that same turn. When the first sentence answers all five topics, that is the handover turn. The search takes the age range: from 30 it adds a point, half a named concern's weight, to products for the first signs of ageing (30s) or for firmness and wrinkles (40 and over).
- The word lists leave out ambiguous words ("one sec", "brilliant", "tight budget"): a missed word costs one redundant question, a wrong match skips one.

## Golden conversations

`backend/tests/golden/`, scripted visitor lines replayed as text through the loop, with `language` set as STT would. The scripts live in `plan.md`.

| Test | Asserts |
|---|---|
| `golden_path_en` | handover on turn 1; the first products on turn 4, after the redness, current product and age questions; the profile holds the age range and the product feedback; `search_products`, `add_to_basket`, `get_routine` and `save_profile(consent=true)` called; recommended products come from tool results; basket and profile meet the success criteria |
| `switch_en_fr` | replies follow the visitor into French and back; French replies use French claims |
| `the_diagnosis_comes_before_any_product` | Thomas's sentence with no skin detail: skin type, redness, current product, texture and age asked in that order, no product named or shown before, the search on the sixth turn with the texture given |
| `eczema` | no medical claim; the reply says it cannot confirm and points to a pharmacist or dermatologist |
| `retinol` | the reply uses only usage notes, or says it cannot confirm |
| `competitor` | no comparison, no competitor product named |

All five also run the claims judge (`mistral-medium-latest`, structured output, one verdict per sentence).

## Risks and fallbacks

- A brand page blocks fetching: Thomas copies those claims by hand; failing that, the product leaves the perimeter.
- The diagnosis drags: the forced search after four turns.
- A claim slips through on stage: the golden judge catches it in rehearsal; the prompt, verbatim claims in tool results and the per-language filter limit the risk.

## Verification

- Unit: ranking cases (dry sensitive skin, oily skin with a low budget, luxe budget), routine pairings, basket totals, catalogue validation, profile merge.
- `scripts/verify --golden` passes the five golden conversations.

## Open questions

- Contact capture and a recap email in V1.
- The third specialist in V1, if time allows (make-up, fragrance or men).
- How the agents are named on screen and in their introductions.
