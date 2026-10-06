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

- 2026-10-05: An agent acts in the same turn it says it will. In Thomas's live run the expert said "Let me find a gentle cleanser... One moment." and stopped, so the search waited for the visitor to speak. The prompt now forbids announcing an action, and as a safety net, a reply that promises one without a tool call (`AgentConfig.promises_action`) is followed in the same turn by a model call that must use a tool (`tool_choice` "any", `backend/app/conversation/loop.py`).
- 2026-10-05: The skincare diagnosis runs in code, the same way every time: skin type, then redness, then texture, each topic skipped once the visitor's words or the profile answer it, and the products only after the last answer (Thomas). In Thomas's live run the expert recommended a cream straight after the handover, and in 10 replays of the first turn it searched at once in 1 and opened with four different questions. While a topic is open the expert has no tools and the context names the topic; when the diagnosis is complete the search is forced in that same turn. Keyword lists decide what the visitor answered, which adds no model call and no delay (spec 002, Diagnosis; `backend/app/agents/diagnosis.py`). After the change: 0 searches in 10 replays, and the same first question each time.
- 2026-10-05: The diagnosis also asks which moisturiser the visitor uses and how they find it, and their age range as optional (Thomas). The feedback is data for the brands' marketing teams: the record keeps any brand named, other companies' included, and the expert never discusses those aloud. The age range is in decades and ranks ageing care higher from 30; gender is neither asked nor inferred, since the catalogue is unisex and a guess from a voice can go wrong on stage. Cross-sell stays the routine and hair before the event: a new category needs real products with approved claims, and makeup needs real shades (spec 002, Diagnosis and Beauty profile).
- 2026-10-05: Diagnosis turns carry no tools, and their replies are checked before they are spoken; one that names a product, a brand or a tool, asks nothing or strays from its topic is replaced by the topic's fixed question. With five topics, the model judged the diagnosis complete early and, its tools shown but blocked, wrote the search out as text and made up a top pick in 3 of 7 live conversations. After both changes: 21 of 21 (spec 002, Diagnosis; `AgentConfig.vet_reply`).

## Models and latency

- 2026-10-04: STT `voxtral-transcribe-realtime-3` (takes `context_bias` for brand names); agents on `mistral-small-latest` (first token about 0.3 s), temperature 0.3, fallback `mistral-medium-latest`; extractor on `mistral-small-latest` at temperature 0; TTS `voxtral-mini-tts-2603` streamed as PCM (first sound about 0.5 s) (spec 000, `backend/app/settings.py`).
- 2026-10-04: Voices `gb_oliver_cheerful` (concierge) and `gb_jane_confident` (skincare), the same in both languages; pending Thomas (`backend/app/agents/voices.py`).
- 2026-10-04: TTS hedging: a second request races after 0.9 s, at most 3 attempts of 5 s each, because about one request in ten stalls, sometimes for 10 s (`backend/app/voice/tts.py`).
- 2026-10-04: First-token timeout of 2.5 s, then a retry, then the fallback model, because the chat API answers 503 in bursts (`backend/app/conversation/mistral_stream.py`).
- 2026-10-04: The context block is a system message right before the latest visitor message, so the prefix above it stays cacheable (`_messages` in `backend/app/conversation/loop.py`).
- 2026-10-04: At most three tool rounds per agent per turn (spec 001).
- 2026-10-04: Fixed lines (welcome, handover, filler) are synthesised once and prefetched, so they play at once (`backend/app/voice/lines.py`).

- 2026-10-05: The expert's voice is Jane Neutral on `voxtral-mini-tts-3`, picked by Thomas by ear from seven versions of the same reply (`/tmp/lex-voices`, rebuilt by a script in the session). Jane Confident on 2603 sounded robotic: each sentence pushed differently. The newer presets of the spike (Sarah, Yael and others) no longer exist in the workspace (`backend/app/agents/voices.py`, `backend/app/settings.py`).
- 2026-10-05: Each reply is spoken in one speech request instead of one per sentence. The speech API takes the whole text and keeps no context between requests, so per-sentence synthesis reset the intonation at every sentence. The backend sends `text.done` when the text of a model call is complete, before tools and before the profile extractor, and the browser speaks it then. It costs about 0.3 to 0.5 s before the first sound, won back by keeping connections open, racing two speech requests from the start and trimming the leading silence (spec 001).
- 2026-10-05: Hands-free end of speech ends the transcription socket after 450 ms of silence and the visitor's line at 700 ms, so the final text (about 0.2 s after the socket ends) no longer adds to the wait: 913 ms from the last word to the final text in Thomas's run, 761 ms in the browser test after. The loudness threshold follows the room (three times the quietest fifth of the last 3 s, from 0.012 to 0.04), because a fixed 0.012 could keep a line open in a noisy hall until the 20 s cap. Audio heard in the 300 ms after the agent stops stays in the pre-roll, so a quick "Yes" keeps its first word (spec 001, End of speech; `frontend/src/lib/speech-gate.ts`).
- 2026-10-05: Mistral's Voice Agents SDK (managed live pipeline with model-based turn detection and interruptions) is the alternative for after the event; it needs a Gemfury token and would replace our engine, the agent handover, the screen events and the cost meter.

## Language

- 2026-10-04: English by default; the agent follows the visitor into French and back. Realtime STT gives no language event, so a local detector reads the final transcript (`backend/app/voice/language.py`).
- 2026-10-04: Spoken replies are two or three short sentences of plain text. Markdown is stripped before TTS because the model's bold text was read aloud (`speakable` in `backend/app/voice/tts.py`).

## Catalogue and claims

- 2026-10-04: 13 real products from L'Oréal Paris, CeraVe and La Roche-Posay, approved by Thomas (`specs/002-discovery/perimeter.md`).
- 2026-10-04: Claims are quoted word for word from brand pages. For pages that block bots, they come word for word from secondary copies of the brand text (retailer and search-engine copies), never from the model; Thomas checks them before the event (perimeter.md, Risks).

- 2026-10-04: When the visitor names a skin condition or asks for a cure, a note in the turn context tells the expert to say it can't give medical advice and to name a pharmacist or a dermatologist. The prompt rule alone was ignored in 2 of 3 golden runs; with the note, 3 of 3 passed (`backend/app/agents/skincare.py`, `MEDICAL`).

- 2026-10-05: When speech to text closes a sentence while the visitor is still talking, the engine keeps listening on a new socket and answers after the visitor's own silence, so nobody is cut off mid-sentence (Thomas; `frontend/src/lib/voice-engine.ts`).

- 2026-10-05: The medical note also forbids saying what a product does in that reply: in a golden run the expert referred to a pharmacist, then offered "products that soothe redness", a benefit without an approved claim. Three runs out of three passed after (`backend/app/agents/skincare.py`, `MEDICAL_NOTE`).

## Profile

- 2026-10-04: A concern is recorded only when the visitor names it: asking for a moisturiser does not mean hydration, and tightness sets the skin type. Fixed after "hydration" appeared in Thomas's record without him mentioning it (`backend/app/profile/extractor.py`).

- 2026-10-04: Observer events (the profile extractor) carry a `latest` callback, so the profile sent at the end of a turn reflects consent given by `save_profile` during that turn. Before, the screen could end on "consent pending" (`backend/app/conversation/agent.py`, `UiEvent.latest`).

## Screen and interface

- 2026-10-04: Conversation on three quarters of the width, with product carousels inside it; the right quarter holds the basket and the customer record as L'Oréal would store it, zero-party data with consent (spec 003).
- 2026-10-04: Agents appear by role with a voice visual; personas and portraits stay out. A camera slot designed now for V2. Stats: average reply time with p90, and the running cost. Hands-free by default, with a switch to hold-to-talk (space bar too). "How voice works" stays in the slides (spec 003).
- 2026-10-04: Look. The ivory first version was rejected. Round one (Noir, Atelier, Studio, Clinic, Caption): Thomas liked Studio's novelty with its black and amber, and Clinic's clean cards and structured profile; he disliked background grids, square shapes, monospace or quirky fonts, a coloured bar on the side of message cards, and beige. Round two (Ember, Onyx, Lumen, Frost, Duo): the final skin takes Frost's look (white, black pills, a black capsule with a yellow waveform, Geist, yellow #FFD23F) with text about 20% smaller, Lumen's agent name with a small dot and its relay steps ("Welcome > Skincare"), and a welcome screen before the conversation. The templates stay under `/templates` (`frontend/src/templates/`).
- 2026-10-05: Product cards respond to the visitor: they lift under the pointer, and a click opens a product sheet with everything the catalogue holds for the product in the visitor's language, approved claims quoted, and a code for its page. Thomas wanted a little interaction in the carousel (spec 003, branch `feat/product-carousel`).
- 2026-10-04: The live screen is a skin that takes the agent as its only prop (`ScreenAgent`), so another template can become a skin later. The first, `frontend/src/skins/frost/`, is being built.
- 2026-10-05: The conversation header shows only "Beauty advisor", as its title after a voice badge (a black disc holding the yellow voice, which Thomas picked from five options under `/templates/titles`), with Restart. Thomas took the "L'Oréal" wordmark out (L'Oréal's logo stays on the welcome screen) and moved the reply-time and cost bubbles to the foot of the right quarter, adding the conversation's duration: they did not belong at the top (spec 003, branch `feat/header-stats`).

- 2026-10-05: The welcome screen is Eclipse, which Thomas picked from the mockups under `/welcome`: black and gold, the headline and Begin inside a golden halo, L'Oréal's real logo top left (the group logo as SVG, public domain on Wikimedia Commons) and "Built with Mistral AI" at the bottom. The Frost welcome felt plain; he wanted glamour, L'Oréal branding and a Mistral credit (spec 003).
- 2026-10-05: The journey adds three moments (spec 006, branch `feat/journey`): a one-line reason why each product suits the visitor, built from catalogue facts; tutorials from the brands and creators, a bank of real videos checked through oEmbed and approved by Thomas; and an email recap with an example in-store coupon, shown as a preview and never sent.
- 2026-10-05: `send_recap` reads the address back and writes only after the same address is confirmed in a later turn; the model had skipped the read-back. The address is masked everywhere it leaves the tool (`backend/app/tools/recap_tools.py`). Replaced the same day by the typed address, below.
- 2026-10-05: A context note triggers `show_tutorials` once the routine is in the basket, as with the medical note: the prompt step alone was skipped in the golden run (`backend/app/agents/skincare.py`).
- 2026-10-05: The visitor types the email on screen. In Thomas's live run, speech to text cut the dictated address at a pause and the expert answered "I'm an AI, so I can't process email addresses", twice, without calling `send_recap`. A field appears after consent, and `POST /sessions/{id}/recap` writes the recap from the typed address, so no model decision stands between the address and the recap. `send_recap` and the read-back are gone; the expert only points at the field, with a context note when the visitor starts saying an address (spec 006, branch `fix/recap-email`).
- 2026-10-05: The expert says it is an AI in its introduction and when asked whether it is a person, and gives the L'Oréal Groupe sentence only when the visitor names another brand. The model had merged the two rules into "I'm an AI, so I can only advise on L'Oréal Groupe products" after ordinary answers (`backend/app/agents/prompts.py`; a golden check keeps "I'm an AI" out of later turns).
- 2026-10-05: The voice moves into the conversation. The black capsule was the heaviest element on screen, and the voice sat in two places (who speaks at the top, the microphone at the bottom) with two status texts. Of five templates on where the voice lives (header pill, breathing island, voice dock, inline voice, voice line), Thomas chose the inline voice: the line being spoken carries a small waveform and the state, the handover is a pill in the conversation, the header stats turn light grey, and the talk bar loses its state text (spec 003, branch `inline-voice`).
- 2026-10-05: A handover takes a breath. The expert joins when the concierge's handover line has played, and speaks 1.2 s later; its words appear with its voice. Before, its text and the "joined" pill showed while the concierge was still talking, and its voice cut in the moment the concierge stopped, which Thomas found unnatural. The reply time is unchanged: the turn's first sound is the concierge's line (specs 001 and 003).
- 2026-10-06: A Stop pill in the header, left of Restart, ends the conversation at once (voice, microphone, transcription, pending requests, backend session) and keeps everything on screen, with the duration frozen and the talk bar saying the conversation has ended; Restart then returns to the welcome screen. Restart was the only way to end a conversation, and it wiped the screen at the same time (spec 003, branch `feat/stop-button`).

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
