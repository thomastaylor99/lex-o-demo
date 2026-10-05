# Decision log

> Source: decisions Thomas took or approved while building the demo, checked against the files each entry points to. Started 2026-10-04, last updated 2026-10-05.

Each entry: date, choice, reason, pointer. "Spec 001" is `specs/001-voice-core/spec.md`, and so on.

## Scope and dates

- 2026-10-04: Event on 2026-10-07, 11:00 to 13:00, Mistral office, 20-minute hands-on slot; dry run on 2026-10-06 at 15:30 (`context/brief.md`, `specs/README.md`).
- 2026-10-04: V0, the voice journey in the terminal, came first so Thomas could judge flow, voices and timing; he validated it the same day ("It works!"). V1, the designed browser screen, by 2026-10-05; V2, the camera, on the night of 2026-10-05 if possible; 2026-10-06 for adjustments (`specs/README.md`).

## Process

- 2026-10-04: Make it work end to end, then latency and polish. No per-task review cycles and few tests: Thomas found about 200 tests excessive for a demo V0 (`specs/v0/tasks.md`, T21).
- 2026-10-04: Parallel subagents each own their files; dependent work stays in one agent (`context/build-lessons.md`).

## Architecture

- 2026-10-04: New repo, with the Decathlon demo as a read-only reference, to keep its files and stale docs out of agent searches (spec 000).
- 2026-10-04: Python 3.14, uv, FastAPI; Next.js 16, React 19, Tailwind 4: the reference's stack, so ported code runs with little change (spec 000).
- 2026-10-04: Own voice pipeline, ported from the reference, which survived a live demo. The Voice Agents SDK waits until after the event: its package index answered 401 (spec 000).
- 2026-10-04: Own conversation loop over chat completions streaming, since Docstral documents no agent switch inside a Conversations API conversation (spec 000).
- 2026-10-04: Agents are configurations; the concierge's call is forced to `transfer_to_agent` and the loop switches agent. Model-driven handoffs misfired on about 30% of first turns at Decathlon and cost 2 to 3 s (spec 000).

## Models and latency

- 2026-10-04: STT `voxtral-transcribe-realtime-3` (takes `context_bias` for brand names); agents on `mistral-small-latest` (first token about 0.3 s), temperature 0.3, fallback `mistral-medium-latest`; extractor on `mistral-small-latest` at temperature 0; TTS `voxtral-mini-tts-2603` streamed as PCM (first sound about 0.5 s) (spec 000, `backend/app/settings.py`).
- 2026-10-04: Voices `gb_oliver_cheerful` (concierge) and `gb_jane_confident` (skincare), the same in both languages; pending Thomas (`backend/app/agents/voices.py`).
- 2026-10-04: TTS hedging: a second request races after 0.9 s, at most 3 attempts of 5 s each, because about one request in ten stalls, sometimes for 10 s (`backend/app/voice/tts.py`).
- 2026-10-04: First-token timeout of 2.5 s, then a retry, then the fallback model, because the chat API answers 503 in bursts (`backend/app/conversation/mistral_stream.py`).
- 2026-10-04: The context block is a system message right before the latest visitor message, so the prefix above it stays cacheable (`_messages` in `backend/app/conversation/loop.py`).
- 2026-10-04: At most three tool rounds per agent per turn (spec 001).
- 2026-10-04: Fixed lines (welcome, handover, filler) are synthesised once and prefetched, so they play at once (`backend/app/voice/lines.py`).

## Language

- 2026-10-04: English by default; the agent follows the visitor into French and back. Realtime STT gives no language event, so a local detector reads the final transcript (`backend/app/voice/language.py`).
- 2026-10-04: Spoken replies are two or three short sentences of plain text. Markdown is stripped before TTS because the model's bold text was read aloud (`speakable` in `backend/app/voice/tts.py`).

## Catalogue and claims

- 2026-10-04: 13 real products from L'Oréal Paris, CeraVe and La Roche-Posay, approved by Thomas (`specs/002-discovery/perimeter.md`).
- 2026-10-04: Claims are quoted word for word from brand pages. For pages that block bots, they come word for word from secondary copies of the brand text (retailer and search-engine copies), never from the model; Thomas checks them before the event (perimeter.md, Risks).

- 2026-10-04: When the visitor names a skin condition or asks for a cure, a note in the turn context tells the expert to say it can't give medical advice and to name a pharmacist or a dermatologist. The prompt rule alone was ignored in 2 of 3 golden runs; with the note, 3 of 3 passed (`backend/app/agents/skincare.py`, `MEDICAL`).

- 2026-10-05: When speech to text closes a sentence while the visitor is still talking, the engine keeps listening on a new socket and answers after the visitor's own silence, so nobody is cut off mid-sentence (Thomas; `frontend/src/lib/voice-engine.ts`).

## Profile

- 2026-10-04: A concern is recorded only when the visitor names it: asking for a moisturiser does not mean hydration, and tightness sets the skin type. Fixed after "hydration" appeared in Thomas's record without him mentioning it (`backend/app/profile/extractor.py`).

- 2026-10-04: Observer events (the profile extractor) carry a `latest` callback, so the profile sent at the end of a turn reflects consent given by `save_profile` during that turn. Before, the screen could end on "consent pending" (`backend/app/conversation/agent.py`, `UiEvent.latest`).

## Screen and interface

- 2026-10-04: Conversation on three quarters of the width, with product carousels inside it; the right quarter holds the basket and the customer record as L'Oréal would store it, zero-party data with consent (spec 003).
- 2026-10-04: Agents appear by role with a voice visual; personas and portraits stay out. A camera slot designed now for V2. Stats: average reply time with p90, and the running cost. Hands-free by default, with a switch to hold-to-talk (space bar too). "How voice works" stays in the slides (spec 003).
- 2026-10-04: Look. The ivory first version was rejected. Round one (Noir, Atelier, Studio, Clinic, Caption): Thomas liked Studio's novelty with its black and amber, and Clinic's clean cards and structured profile; he disliked background grids, square shapes, monospace or quirky fonts, a coloured bar on the side of message cards, and beige. Round two (Ember, Onyx, Lumen, Frost, Duo): the final skin takes Frost's look (white, black pills, a black capsule with a yellow waveform, Geist, yellow #FFD23F) with text about 20% smaller, Lumen's agent name with a small dot and its relay steps ("Welcome > Skincare"), and a welcome screen before the conversation. The templates stay under `/templates` (`frontend/src/templates/`).
- 2026-10-04: The live screen is a skin that takes the agent as its only prop (`ScreenAgent`), so another template can become a skin later. The first, `frontend/src/skins/frost/`, is being built.

- 2026-10-05: The journey adds three moments (spec 006, branch `feat/journey`): a one-line reason why each product suits the visitor, built from catalogue facts; tutorials from the brands and creators, a bank of real videos checked through oEmbed and approved by Thomas; and an email recap with an example in-store coupon, shown as a preview and never sent.
- 2026-10-05: `send_recap` reads the address back and writes only after the same address is confirmed in a later turn; the model had skipped the read-back. The address is masked everywhere it leaves the tool (`backend/app/tools/recap_tools.py`).
- 2026-10-05: A context note triggers `show_tutorials` once the routine is in the basket, as with the medical note: the prompt step alone was skipped in the golden run (`backend/app/agents/skincare.py`).

## Cost

- 2026-10-04: The backend meters each session (LLM tokens per model, STT seconds from audio bytes, TTS characters per attempt), prices it in euros, and reports the total in `turn.done` and `GET /sessions/{id}/usage`. Built and checked live: a first turn costs about €0.004 with audio (`backend/app/usage/`, spec 001, Running cost).
- 2026-10-04: Prices from mistral.ai/pricing, in euros: small €0.12 in and €0.50 out per million tokens, medium €1.25 and €6.40, TTS €0.01 per 1,000 characters. `voxtral-transcribe-realtime-3` is not on the public list; on 2026-10-05 Thomas chose the listed realtime model's €0.0053 per minute over the Decathlon placeholder of €0.03 (`backend/app/usage/pricing.py`).

## Git

- 2026-10-04: Thomas makes the commits, locally; a hook blocks the agent's git writes. Push to a private GitHub repo once V1 runs live (`context/build-lessons.md`).

## Open

- The TTS euro price (the page shows €0.01 beside $0.016 per 1,000 characters).
- The two voices.
- The claims from secondary sources, and the hair oil's 96 h anti-frizz claim (perimeter.md, Risks).
- The private GitHub repo.
- The haircare expert (V1, spec 002 extended).
- Presenter controls and reset between volunteers (spec 005).
- The camera (spec 004, V2).
- The tutorial list (`specs/006-journey/tutorials.md`), and whether the email should also be masked in the live transcript.
