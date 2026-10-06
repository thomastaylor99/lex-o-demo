# Handover: the demo at v2

> Source: written by the coding agent at Thomas's request on 2026-10-06, from the build sessions of 2026-10-04 and 2026-10-05, `git log`, and the files each line points to. Update it whenever the state below changes.

Read this first in a new session, then `AGENTS.md` for the rules and `specs/v2/architecture.md` for the system.

## Where things stand

- `main` is at `0888b10` ("v2: demo-ready voice concierge, open fixes listed in backlog.md"), pushed to Thomas's private GitHub repo `lex-o-demo` on 2026-10-06. `integrate/v1-2` points to the same commit.
- Every check passed on that commit: quick checks, the production build, the four browser tests (scripted conversation, camera switch, product sheet, real audio through a fake microphone), and the golden conversations, 7 of 7 in three runs in a row.
- Dry run: 2026-10-06 at 15:30. Event: Wednesday 2026-10-07, 11:00 to 13:00, Mistral office, room 2.11, a 20-minute hands-on slot (`context/brief.md`).
- Version names: "v2" is this demo-ready commit. `specs/README.md` once used V2 for the camera; the camera (spec 004) is still unbuilt, apart from its slot behind `?camera=1`.

## Versions

| Version | Commits | What it holds |
|---|---|---|
| V0 | `9565a90` | The skincare journey by voice in the terminal (`backend/scripts/talk.py`), specs 000 to 003, the first UI templates |
| V1 | `6ea0df3`, `7ada306`, `50b09fe` | The designed screen (Frost skin) on the live engine, the cost meter, unit, browser and golden tests; pushed as `50b09fe` |
| v2 | `0888b10` | Everything in the next section |

## What changed from V1 to v2

Voice output (spec 001, Speech output):
- Each reply is spoken in one request when its text is complete (`text.done`), so the intonation no longer resets at every sentence. The expert's voice is Jane Neutral on `voxtral-mini-tts-3`, picked by Thomas by ear; the concierge keeps Oliver Cheerful.
- Two speech requests race from the start, a failed one is replaced after 200 ms while the other keeps going, the leading silence (about 255 ms) is trimmed, and the Mistral client keeps its connections open between turns. `/voice/speak` takes up to 2,000 characters.

Listening (spec 001, End of speech):
- `frontend/src/lib/speech-gate.ts`: the transcription socket ends after 450 ms of silence and the line at 700 ms, so the final text no longer adds to the wait (0.91 s down to 0.70 to 0.76 s from the last word). Speech that comes back in between resumes the line on a new socket.
- The loudness threshold follows the room's noise (0.012 to 0.04), and audio in the 300 ms after the agent stops stays in the pre-roll, so a quick "Yes" keeps its first word.
- When the transcription closes a sentence while the visitor is still talking, a new socket carries the same line.

Conversation (spec 002, Diagnosis; `context/decisions.md`, Architecture):
- The diagnosis runs in code, the same way every time: skin type, redness, the moisturiser used now and how they find it, texture, age range (optional), each skipped once answered. Diagnosis turns carry no tools, and their replies are checked before they are spoken: a reply that names a product, a brand or a tool, asks nothing or strays from its topic becomes the topic's fixed question. The turn the diagnosis completes, the search is forced.
- An agent acts in the turn it says it will: a reply that promises an action before any tool ran is followed by a call that must use one.
- The expert joins 1.2 s after the concierge's handover line. It says it is an AI in its introduction only, gives the medical referral when a condition is named, and never discusses another company's product.

Data capture (spec 002, Beauty profile):
- Product feedback (brand as said, any company; product; liked, disliked or mixed; the reason) and the age range in decades join the profile. The age range nudges the ranking towards ageing care from 30. Gender is neither asked nor inferred.
- The customer record shows twelve rows.

Journey (spec 006):
- A "For you" line on each product, built from catalogue facts; tutorials from the brands and creators with QR codes and links; an email recap with an example in-store coupon, from an address typed in a field on screen after consent, shown as a preview and never sent.

Screen (spec 003):
- The Eclipse welcome (black and gold, L'Oréal's logo, "Built with Mistral AI"); the voice inside the conversation, on the line being spoken; a header with the voice badge, "Beauty advisor" and Restart; reply times, duration and cost at the foot of the right quarter; product cards that open a product sheet; the email field and the recap preview.

Tests: 374 backend and 43 frontend unit tests, 3 browser tests plus the real-audio one, 9 live backend tests (7 golden conversations, real speech in and out in English and French). The claims judge knows which brands belong to L'Oréal Groupe.

## How a conversation runs now

1. Welcome line, then the visitor's need. The concierge hands over in code; its line plays, and the expert introduces itself and asks the first open diagnosis question in the same turn.
2. One to five diagnosis questions, then the forced search: the expert presents the top pick with one reason from the visitor's words and one approved claim; two alternatives are on screen.
3. The visitor chooses; the basket fills; the routine completes around the cream; one hair question; tutorials appear (a context note triggers them); the expert asks to save the profile; after consent the email field appears; the typed address brings the recap preview.
4. The customer record fills as the visitor talks; reply times and cost update after each turn.

Sample from the live server on 2026-10-05: "I'm looking for a new skincare routine, especially a new moisturizer" brought questions on skin type, redness and the current moisturiser; "I had a L'Oréal one, I don't know which, but I found the texture too heavy" answered texture too; the age question came as optional; the top pick was a light cream "that won't feel heavy".

## Risks to watch at the dry run

- The spoken top pick matches the screen's since 2026-10-06 (the search names its `top_pick`, and a reply that presents another product is replaced).
- Claims on presentation turns: twice on 2026-10-05 (before the last fixes) the expert added an effect no approved claim holds ("reduces wrinkles"); none in 21 conversations since. If it recurs, apply the diagnosis reply check to presentation turns (`backlog.md`, Claims risk to watch).
- Hands-free in a busy room: the noise threshold and the resume of a paused line were tested with clean recorded audio only. The fallback is hold to talk (button or space bar).
- Sessions expire after 30 idle minutes, and every turn then fails silently (`backlog.md`, fix 1): press Restart before each visitor and after a long pause.
- At startup the backend log should read `lines_warmed lines=14 of=14`; a line that failed to warm plays as nothing (fix 11).
- The speech service is slow now and then: when both racing requests stall, a reply starts 1.3 to 2.2 s late.
- Parallel sessions: other agents worked in worktrees and also wrote into the main folder, and v2 picked up their header and product-sheet work untested until after the commit. Before any commit, build and run the browser tests on what is actually in the folder.

## Open

- `backlog.md`: fixes 1, 5, 6 and 8 to 12, the cleanup, the data ideas (where to ship or which store, where the visitor usually buys), the claims risk, and the move of mic capture to an AudioWorklet after the event.
- For Thomas (`context/decisions.md`, Open): the `voxtral-mini-tts-3` price (€0.01 per 1,000 characters is assumed); the claims taken from secondary sources and the hair oil's 96 h claim; the tutorial list (`specs/006-journey/tutorials.md`); the haircare expert; presenter controls (spec 005); the camera (spec 004).

## Running, checking, restarting

- Backend: `cd backend && uv run uvicorn app.main:app --port 8000` (no reload: restart after a backend change). Frontend: `cd frontend && npm run build && npx next start -p 3100`, and restart `next start` after every build, `scripts/verify` included.
- During the sessions both ran in the background with logs in `/tmp/lex-backend.log` and `/tmp/lex-frontend.log`; `lsof -nP -iTCP:8000 -sTCP:LISTEN` finds the process to stop.
- Checks: `scripts/verify --quick` (the Stop hook runs it), `scripts/verify` (build and browser tests), `scripts/verify --golden` (live API, a few cents). The live conversations vary: run the golden ones twice after touching prompts or the diagnosis. The real-audio browser test: `cd frontend && LIVE=1 npx playwright test --project=e2e tests/e2e/live-audio.spec.ts`.
- Screenshots: `npx playwright screenshot --channel chrome --viewport-size=1920,1080 --wait-for-timeout=72000 "http://localhost:3100/?mock=1&autostart=1" out.png` shows the end of the scripted conversation.

## Working with Thomas

- He runs the demo and tests by voice himself, and reports what he heard; the fix comes first, then the evidence (numbers, a replay, a test).
- Iteration over process: make it run end to end, no per-task review cycles, tests where they protect the demo.
- Before a design, ask the open questions together, as multiple choice with a recommended option; he answers quickly, then expects the build without more check-ins.
- Writing: his rules in `~/.claude/CLAUDE.md` apply to everything, commit messages included: short, sentence case, no all caps, no middle dot, no "X, not Y" constructions.
- Git: Thomas pushes. A hook blocks the agent's `git commit` and `git push`; prepare the command for him to run with `!`, and commit only when he asks for it in so many words.
- Taste: black with yellow or amber, Clinic's clean cards; no beige, no coloured bar on the side of cards, no grids, no monospace (`context/decisions.md`, Screen and interface).

## Repository state

- Branches: `main` and `integrate/v1-2` at `0888b10`. Older branches with worktrees under `.claude/worktrees/` (ignored by git): `feat/header-stats` (`header-advisor`), `feat/product-carousel`, `inline-voice`, `fix/recap-email`, `worktree-voice-bar`, and a detached `preview`.
- Every worktree is behind v2. The only change they hold that v2 lacks is the black Restart pill in `header-advisor` (v2 has a white one); the rest is older copies of files v2 already has. They can go after the event, Thomas's call (`git worktree remove`).

## Where to read what

| Need | File |
|---|---|
| Rules, layout, commands | `AGENTS.md` |
| The system as built | `specs/v2/architecture.md` |
| Why each choice was made | `context/decisions.md` |
| What is left | `backlog.md` |
| Pitfalls met while building | `context/build-lessons.md`, `context/voice-lessons.md` |
| Event, audience, constraints | `context/brief.md` |
| Claims rules, product perimeter | `context/claims-policy.md`, `specs/002-discovery/perimeter.md` |
| Streams | `specs/001-voice-core/`, `specs/002-discovery/`, `specs/003-journey-ui/`, `specs/006-journey/` |
