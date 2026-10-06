# 002 Discovery

> Status: approved 2026-10-04. Owner: Thomas. Last updated: 2026-10-06.

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
3. Diagnosis: the same topics, in the same order, before any product: the product sought (when the opening names none), skin type, redness, what they would most like to improve, the moisturiser they use now and how they find it, texture, then age range (optional). One question per turn, worded by the model from the visitor's words; a topic the visitor already answered is skipped, so it usually takes four or five turns. See Diagnosis below.
4. Recommendation: one best match and up to two alternatives; one spoken reason tied to the visitor's words and one approved claim. Prices and details stay on screen. The product the expert presents first is always the one the screen marks "Top pick": the search result names it `top_pick`, and a reply in the search's turn that presents another product first, or none by name, gives way to the top pick's fixed presentation (its full name, its fit line, an approved claim word for word) (Thomas, 2026-10-06).
5. Choice: the chosen products go into the basket.
6. Routine: in the same turn, the expert suggests the one product that completes the routine (for a cream, the cleanser that suits the visitor's skin), with its approved claim; the next turn adds it if the visitor agrees, then the tutorials for the routine show. The same steps every time; see Routine below.
7. Cross-sell: once the routine is in the basket and its tutorials are on screen (spec 006), one question about hair, then one haircare suggestion, added if the visitor agrees; two turns at most. See Cross-sell below.
8. Close: the expert asks to save the profile and routine. Yes keeps them for the session; no discards the profile. A two-sentence recap ends the conversation.

At any turn the visitor may switch language: the reply follows, with the claims of that language.

## Agents

**Concierge.** Speaks only fixed lines, in English and French: `welcome`, `clarify`, `handover_skincare`. It introduces itself as L'Oréal's AI beauty concierge. Its model call is forced to `transfer_to_agent(agent, summary)` with `agent` in `skincare`, `unclear`. On `unclear` the tool ends the turn with the `clarify` line; a second `unclear` goes to skincare in V0. On `skincare` the tool asks for the `handover_skincare` line and the switch.

**Skincare expert.** Introduces itself as an AI skincare expert and picks up the concierge's summary. Fixed line: `filler_search`, in English and French, listed in its `tool_fillers` for `search_products` and `get_routine`. Prompt rules: two or three short sentences, nothing read from the screen (`context/voice-lessons.md`); claims rules 2 to 4 of `context/claims-policy.md`; reply in the language named in the context block; never name a competitor; no medical wording, and for medical questions suggest a pharmacist or dermatologist. The diagnosis decides its tools until the first search: none while a topic is open, then `search_products` forced in the turn the diagnosis completes. If eight expert turns pass without a search (the seven questions and one asked again), the loop forces `search_products` on the next call.

## Tools

| Tool | Agent | Arguments | Returns |
|---|---|---|---|
| `transfer_to_agent` | concierge | `agent`, `summary` | confirmation; the loop switches agent |
| `search_products` | skincare | `category` (required); `skin_type`, `concerns`, `sensitive`, `texture`, `max_price_eur`, `fragrance_free`, `spf_needed` (optional) | up to three products, best match first, with claims and usage notes in the session language; emits `products.shown` |
| `get_routine` | skincare | `product_id` | the one product that completes the routine around the visitor's first skin choice, with claims and usage notes, and nothing once the basket completes it; emits `products.shown` |
| `add_to_basket` | skincare | `product_ids` | basket items and total; emits `basket.updated`, and `profile.updated` with the budget and routine size the basket shows |
| `save_profile` | skincare | `consent`, `first_name` (optional) | profile kept or discarded, and a summary; emits `profile.updated` |

Ranking is plain code: points for skin type, each matching concern, texture and fragrance-free; products unsuitable for sensitive skin are dropped when `sensitive` is true; products above `max_price_eur` are dropped; ties go to the price closest to the budget. A haircare search ignores the skin criteria (skin type, sensitivity, texture, SPF, age range), so a sensitive skin carried over from the skin search cannot empty it: neither hair product's page mentions sensitive skin. Results only include products that have claims in the session language. Tool results never carry internal scores.

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
| `pairs_with` | list of product ids | a preference for `get_routine` (`backend/app/catalogue/pairing.py`); three creams link no cleanser |

## Beauty profile

Fields, all optional until filled: `language`, `first_name`, `skin_type`, `concerns`, `sensitive`, `texture_preference`, `budget_band` (`under_20`, `20_to_40`, `40_to_80`, `over_80`), `routine_size` (`minimal`, `standard`, `full`), `fragrance_free`, `hair_type`, `hair_concerns`, `age_range` (`under_30`, `30s`, `40s`, `50s`, `60_plus`), `product_feedback` (each product the visitor uses or used: `brand` as said, any company; `product`; `verdict` `liked`, `disliked` or `mixed`; `reason` in their words), `consent` (`pending`, `given`, `declined`), `inferred` (the fields read from the basket). Basket items come only from `add_to_basket`. The expert never discusses another company's product aloud: when the visitor says they use one, it thanks them and moves on.

Read from the basket (Thomas, 2026-10-06: "the budget can be inferred from the product we chose, so it can evolve"): after each add, the budget band of the dearest product chosen and the routine size from the number of skin products fill those fields when the visitor stated neither, and `inferred` names them; the record shows them "from your choices". A value the visitor states takes the field back. Searches, product cards and the recap read only what the visitor stated (`backend/app/profile/inferred.py`).

The extractor runs after each final transcript, beside the turn: `mistral-small-latest` with structured output (every field required and nullable, the field guide in its prompt, budget read in euros and the age in years, both banded in code) reads the last agent message and the visitor's reply, returns only what the visitor's words support, and the result merges into the session profile. `profile.updated` goes out before `turn.done`. The profile lives in memory and disappears with the session or on a "no" at the close.

## Perimeter

Thomas narrowed it on 2026-10-04 to two or three brands, about 12 products: L'Oréal Paris (Consumer Products: three face moisturisers, one serum, two Elseve haircare products for the cross-sell), CeraVe (Dermatological Beauty: three face moisturisers including one with SPF, two cleansers), and La Roche-Posay only where a product clearly needs it, such as a sunscreen (two at most). Coverage: dry, normal, combination and oily skin; hydration, sensitivity, first signs of ageing, radiance; rich and light textures; at least one day cream with SPF; at least two fragrance-free products. A research subagent drafts the shortlist into `specs/002-discovery/perimeter.md`; Thomas approves it before claims are copied from public brand pages only (NDA unsigned as of 2026-10-03).

## Diagnosis

Thomas, 2026-10-05: the expert asks the same questions, in the same order, every time, and recommends only after the last answer. `backend/app/agents/diagnosis.py` keeps the state per session; `backend/app/agents/skincare.py` reads it for the tool choice and the context block.

- Topics, in order: the product sought (only when the opening and the concierge's summary name none), skin type (how the skin usually feels: dry, oily, combination or normal), redness (whether it reddens, stings or reacts when a cream goes on), the concern (what they would most like to improve, such as hydration, blemishes or the first signs of ageing; Thomas, 2026-10-06, so the record holds it), the current product (which moisturiser they use and how they find it: product feedback for the brands' marketing teams, asked before texture since "too heavy" answers both), texture (light or rich), age range (asked as optional; a decade is enough). Gender is neither asked nor inferred: the 13 products are unisex, and a guess from a voice can go wrong on stage (Thomas, 2026-10-05).
- A topic is answered when the visitor's words mention it (word lists in English and French), when the profile holds it (the extractor's earlier turns), or when the expert asked about it and the visitor replied with anything but a question. A question gets the topic asked again once; after that, any reply moves on. The profile never answers the concern: the extractor read "quite dry" as a hydration concern in a golden run and the question never came. A texture word answers the texture only with a direction ("too thick", "light"; "the texture is nice" does not).
- Texture from the current product (Thomas, 2026-10-06: "too thick" skipped the texture question and left the record empty): a cream found too heavy, thick, rich or greasy means light, one found too light or not nourishing enough means rich. The extractor records it, and the next question opens by saying it back ("So, something lighter."), in the note and in the fixed question.
- Each question opens with a few words that pick up the visitor's answer, naming no brand.
- Each turn, the context block names the one topic to ask about, and the call carries no tools at all, so the expert cannot search early; a "let me find" said without tools forces nothing. With the tools shown and `tool_choice` "none", the model wrote the search out as text and made up a top pick, which the voice would have read.
- Before it is spoken, each diagnosis reply is checked (`AgentConfig.vet_reply`): one question of at most 60 words, on its topic (the topic's question words), naming no product, brand or tool. Otherwise the topic's fixed question replaces it, in the session language, after the introduction on the handover turn. The browser speaks and shows `text.done`, so the visitor only ever hears the replacement.
- The turn the diagnosis completes, `search_products` is forced and the context says so; the expert presents the top pick in that same turn. When the first sentence answers every topic, that is the handover turn. The search takes the age range: from 30 it adds a point, half a named concern's weight, to products for the first signs of ageing (30s) or for firmness and wrinkles (40 and over).
- The word lists leave out ambiguous words ("one sec", "brilliant", "tight budget"): a missed word costs one redundant question, a wrong match skips one.

## Routine

Thomas, 2026-10-06: the routine is the cream and one cleanser, the same way every run. In his two runs that morning the top pick was the CeraVe AM lotion, which links no cleanser in the catalogue: `get_routine` came back empty and the model filled the gap, offering "a cleanser and a serum" (three cleansers and a serum on screen) in one run and going straight to the tutorials with the cream alone in the other. `backend/app/agents/routine.py` picks each step from what the tools recorded; the model words it.

1. Fetch, the turn the visitor's first skin product goes in the basket: the next call is forced to `get_routine`. It returns one product: for a cream, the cleanser that suits the visitor's skin type (the cream's linked cleanser among those, then the one made for the same skin types: hydrating for dry and normal skin, foaming for oily and combination); for a cleanser, serum or sunscreen chosen first, the cream for the visitor. One card shows, marked as completing the routine.
2. Offer, the same turn, with no tools: the note names the product and quotes its first approved claim; the expert says the choice is in the basket, suggests the product by its full name with that claim, and asks whether they would like it too. A reply that does not name it, names another product or a serum or sunscreen, or asks nothing becomes the fixed offer.
3. Decide, the next turn: a yes (yes, sure, that would be great, oui, volontiers) forces `add_to_basket` with it, then `show_tutorials`; a no (no thanks, I'm good, non merci) forces `show_tutorials`; a question gets an answer and the offer again, and the turn after shows the tutorials whatever the answer.
4. Tutorials, the same turn: one sentence on how to use the routine, "with demos from" the brands and creators the tool names, and the QR codes on screen. Told "a code to scan", the expert made up a number in 7 of 10 replays: a sentence that gives a code a number becomes the fixed sentence. The hair bridge's question ends the reply.

`show_tutorials` refuses while a skin product is in the basket and its routine product was not suggested yet, or was suggested in that same turn. With nothing to show, it still closes the routine, so the hair bridge opens.

## Cross-sell

Thomas, 2026-10-06: after the cleanser, show that the expert also cross-sells into hair. One short bridge in the expert's own voice, with no new agent, so no handover pause. `backend/app/agents/hair.py` picks the step from what the tools recorded (the turn the tutorials first showed, the turn haircare was first searched); `backend/app/agents/skincare.py` puts that step's note in the context, as it does for the diagnosis and the tutorials.

1. Ask, the turn the routine's tutorials step runs (Routine, step 4): after its sentence about the tutorials, the expert asks one question about the visitor's hair (how it feels, or its type), with no tools. A reply that asks something else that turn (saving the profile) keeps its statements and ends on the fixed hair question instead: "And your hair: how does it usually feel, dry, frizzy, or fine as it is?" The extractor fills the record's hair row from the answer.
2. Search, the next turn, only if the expert's last reply asked about hair: an answer that describes the hair (dry, frizzy, wavy, curly, secs, frisottis and so on) forces `search_products` with category `haircare`; an answer that wants nothing ("no thanks, it's fine") leaves the choice to the model, which moves on to saving the profile. The catalogue's two haircare products come back, the Elvive Extraordinary Oil first (ranked by concern, then the budget), and show as a product group with their one-line reason ("For dry hair: within your budget.").
3. Present, the same turn: the note names the first result and quotes its first approved claim, which the expert voices word for word, saying the shampoo beside it goes with it and asking whether they would like it. Asked only for "one approved claim", it voiced "nourish dry ends and add shine" in the first golden run.
4. Decide, the turn after: `add_to_basket` if the visitor agrees, nothing if they decline; either way the expert then asks to save the profile, and the journey carries on (save, typed email, recap).

If the expert never asks about hair, or the visitor answers with a question, the bridge closes and the journey carries on.

## Golden conversations

`backend/tests/golden/`, scripted visitor lines replayed as text through the loop, with `language` set as STT would. The scripts live in `plan.md`.

| Test | Asserts |
|---|---|
| `golden_path_en` | handover on turn 1; the first products on turn 5, after the redness, concern, current product and age questions; the routine as in Routine, with no serum or sunscreen shown; the profile holds the hydration concern; the profile holds the age range and the product feedback; `search_products`, `add_to_basket`, `get_routine` and `save_profile(consent=true)` called; the turn the tutorials show asks about hair, the answer ("wavy, and quite dry at the ends") brings both haircare products with the oil first, and the oil goes in the basket in the turn that asks to save the profile; recommended products come from tool results; basket (moisturiser, cleanser, haircare) and profile (hair type and concern) meet the success criteria |
| `switch_en_fr` | replies follow the visitor into French and back; French replies use French claims |
| `the_diagnosis_comes_before_any_product` | Thomas's sentence with no skin detail: skin type, redness, concern, current product, texture and age asked in that order, no product named or shown before, the search on the seventh turn with the texture given |
| `thomas_runs_complete_the_routine_the_same_way` | Thomas's two live runs of 2026-10-06, line for line, with a concern answer added: the top pick said; one cleanser offered by name in the cream's turn and nothing else shown; the yes adds it, the tutorials cover both products, the hair question follows; the record holds texture light (from "too thick" and "too rich"), a concern, and the budget and routine size from the choices. `backend/scripts/replay_journey.py` replays both N times and counts the runs that keep the journey |
| `eczema` | no medical claim; the reply says it cannot confirm and points to a pharmacist or dermatologist |
| `retinol` | the reply uses only usage notes, or says it cannot confirm |
| `competitor` | no comparison, no competitor product named |

All five also run the claims judge (`mistral-medium-latest`, structured output, one verdict per sentence).

## Risks and fallbacks

- A brand page blocks fetching: Thomas copies those claims by hand; failing that, the product leaves the perimeter.
- The diagnosis drags: the forced search after eight expert turns.
- A claim slips through on stage: the golden judge catches it in rehearsal; the prompt, verbatim claims in tool results and the per-language filter limit the risk.

## Verification

- Unit: ranking cases (dry sensitive skin, oily skin with a low budget, luxe budget), routine pairings, basket totals, catalogue validation, profile merge.
- `scripts/verify --golden` passes the five golden conversations.

## Open questions

- Contact capture and a recap email in V1.
- The third specialist in V1, if time allows (make-up, fragrance or men).
- How the agents are named on screen and in their introductions.
