# Backlog

> Work found but not scheduled yet. Source: three audits of `main` at `50b09fe` on 2026-10-05 (dead code, backend, experience). Effort: small is under an hour, medium a few hours. Open decisions for Thomas live in `context/decisions.md` (Open).

Branches when the work starts: `fix/experience` for the fixes, `chore/v1-cleanup` for the cleanup.

## Before the event (found in the live run of 2026-10-05)

Done on 2026-10-05, on `integrate/v1-2`: the expert acts in the same turn instead of announcing a search and waiting; each reply is spoken in one request (one intonation) by Jane Neutral on `voxtral-mini-tts-3`; fixes 2, 3, 4 and 7 below.

Done on 2026-10-05 (branch `fix/recap-email`, merged through `integrate/v1-2`): the visitor types the email in a field on screen, so dictation can no longer be cut or refused; "I'm an AI" stays in the introduction, and the L'Oréal Groupe sentence comes only when the visitor names another brand. The field closes with "No thanks" or Escape, keeps hold-to-talk on Space, is never stored or suggested by the browser, and the expert says so when the recap fails.

## Voice pace

Measured on 2026-10-05: the same sentence in the same voice lasts 3.0 s in one take and 4.9 s in another; the pace ranges from 1.6 to 5.6 words per second (median 3.4), and slow takes hold up to 1.7 s of silence in a five-word sentence. The stream is never the cause (0 gaps in 45 sentences; audio arrives three to six times faster than it plays). The speech API exposes no speed, temperature or seed (`mistralai` 3.0.0 `SpeechRequest`: input, model, voice_id, ref_audio, response_format, stream).

| Idea | Effect | Effort |
|---|---|---|
| Trim trailing silence, and shorten pauses over 0.3 s, as the stream passes (`backend/app/voice/tts.py`; leading silence is trimmed since 2026-10-05) | Removes most of the drag in slow takes, no delay | Small |
| Measure the pace of each sentence after the first (they are generated while the previous one plays) and speed up slow ones without changing the pitch | Evens the pace, no delay; listen to check the audio stays natural | Medium |
| Synthesise each fixed line three times at startup and keep the best-paced take | Welcome and handover always sound right | Small |
| Measure three or four voice presets for steadiness | Maybe a steadier voice | Small |
| Ask Mistral's speech team about a speed or seed control | Fixes it at the source | Thomas |

## Fixes (the visitor feels them)

Measured in Thomas's live run of 2026-10-05 (15 turns, from the end of his speech to the first sound): median 2.1 s, from 1.5 to 3.5 s. A typical turn: 0.9 s to detect the end of speech and get the final text, 0.4 to 0.6 s for the model's first sentence, 0.5 s for the speech service's first audio. The swings came from the speech service: its first audio took 1.2 to 1.7 s on one turn in four (15 of 35 requests over 0.9 s, the slowest 2.4 s). The voice preset plays no part: every voice runs on the same model.

| # | What happens | Fix | Effort | When |
|---|---|---|---|---|
| 1 | A session expires after 30 idle minutes (`backend/app/settings.py`, `session_ttl_s`); every turn then gets a 404 and the screen stays silent until Restart. Begin pressed at a 10:30 soundcheck breaks the first volunteer. | On a 404, create a new session and retry the turn; play the clarify line when a turn fails (`frontend/src/lib/voice-engine.ts`) | Small | Now |
| 2 | The Mistral client drops idle connections after 5 s, so each turn opens new ones (model, then speech): 40 to 150 ms a turn, and the slow first-request outliers the TTS spike saw. | Build the client with an `async_client` keeping connections 300 s (`backend/app/main.py`) | Small | Done 2026-10-05 |
| 3 | End of speech waits 700 ms of silence plus about 190 ms for the final text, with a fixed loudness threshold (0.012). In a noisy hall the silence may never register (20 s cap) and stray voices start turns. | Track the noise floor, close the transcription socket after 400 ms of silence and open the turn at 700 ms, cap utterances at 10 s | Medium | Done 2026-10-05 (socket at 450 ms; the cap stays 20 s) |
| 4 | Speech start: the backup request starts only after 0.9 s, so a slow first chunk still costs about 1.4 s (seen on one turn in four); about 80 ms of silence opens each sentence; errors retry at once, so a burst of 429 or 503 skips a sentence silently. | Race two requests from the start for the first sentence of each turn (about a tenth of a cent more per turn), back up at 0.6 s for the others, trim leading samples below -40 dBFS, wait 200 ms before a retry after an error (`backend/app/voice/tts.py`) | Small | Done 2026-10-05 (two requests race on every reply) |
| 5 | The welcome waits for config, session and mic one after the other, and the line prefetch can download the welcome twice. | Run config and session in parallel, cache requests rather than results, play the welcome while the mic opens: 0.2 to 0.5 s sooner | Small | Now |
| 6 | After "yes, that's right" the recap is written before the expert speaks: up to 4 s of silence past the filler line. The 6 s budget is really 5 s (the HTTP read timeout fires first). | Start writing the recap at the read-back and await it on confirmation (`backend/app/tools/recap_tools.py`) | Medium | After the next live check |
| 7 | Audio in the 300 ms after the expert stops is thrown away, so a quick "Yes, ..." loses its first word. | Keep filling the pre-roll during that pause (`voice-engine.ts`, `LISTEN_GUARD_MS`) | Small | Done 2026-10-05 |
| 8 | `turn.done` waits for the profile extractor (up to 3 s after the reply), which delays a short last sentence and the mic reopening. | Send `turn.done` before waiting for the extractor; keep its events on the stream (`backend/app/conversation/loop.py`) | Small | Now |
| 9 | Within a turn, the context block is rebuilt for each model call, so the call after a tool misses Mistral's prompt cache; the history is never trimmed. | Build the context block once per turn; cap the history | Small | Now |
| 10 | The 13 product images weigh 2.8 MB at 800 px for a 128 px display; the whole skin re-renders on every update; auto-scroll jumps a frame late and pulls a presenter who scrolled up back down. | 320 px WebP preloaded at start; memoise transcript entries, carousels and side panel; `useLayoutEffect` and scroll only when near the bottom | Small | Now |
| 11 | Three fixed lines (`filler_search` in English, `filler_recap` in both languages) failed to synthesise at startup in the live run, so the filler that covers a search can stay silent. | Retry the lines that failed in the background until each is cached; fetch a missing one on demand (`backend/app/voice/lines.py`) | Small | Now |
| 12 | A sentence whose speech times out is skipped without a sound ("Would you like me to email you a recap..." in the live run); the text stays on screen only. | Retry that sentence once from the browser before moving on (`frontend/src/lib/voice-engine.ts`) | Small | Now |

## Cleanup (no behaviour change)

Frontend:
- Delete the create-next-app images `frontend/public/{file,globe,next,vercel,window}.svg`, and the labels `alsoConsider`, `emptyDiscovery`, `earlier`, `end` in `frontend/src/components/i18n.ts` (left by the ivory screen).
- Stop exporting `LiveScreen` and `MockScreen` (`components/app/Screen.tsx`).
- Fix stale comments: `lib/events.ts` points to `backend/app/catalogue/views.py` (now `backend/app/tools/views.py`); `dev/mockVoiceAgent.ts` mentions the discovery panel; `skins/types.ts` says every component takes only the agent.
- Tests: `tests/unit/reply-stats.spec.ts` names six replies (the script has eight); the `getByRole("switch")` branch in `tests/e2e/screen.ts` can never match.
- Tests: give each worktree its own `E2E_PORT`. Playwright reuses any server already on 3210, so on 2026-10-05 a run on `feat/welcome-mockups` tested the recap-email build.
- Replace `frontend/README.md` (create-next-app text) with a pointer to the root README; replace the default `src/app/favicon.ico`.
- Optional: drop dead branches (`Header.tsx` null stats, unused default props).

Backend:
- Delete `ProductFacts.usage_note` (`app/recap/facts.py`), `AgentConfig.transfer_targets` (`app/conversation/agent.py`, `concierge.py`), `Basket.divisions()` (`app/catalogue/basket.py`) and the tests that only cover them.
- Delete the empty `backend/conftest.py` and the two "products.json arrives in T20" skips in `tests/unit/test_catalogue.py`.
- Delete the V0 one-off scripts `scripts/smoke_{stream,stt,tts,extractor}.py` (the golden tests cover audio in to audio out); fix the stale docstring in `scripts/make_test_audio.py`.
- `scripts/talk.py`: import `BRANDS` and `context_bias` from `app/services.py` instead of copies, and drop the V0 fallback catalogue.
- Move `judge_model` from `app/settings.py` into the golden tests' settings.

Docs:
- `specs/v1/architecture.md`: the 0.6 s "first sound" is measured in the backend; the visitor feels about 1.4 s on the first turn and 2 s later (the 0.7 s silence wait and the browser hops come on top).
- Spec 001: drop the debug page, add `tutorials.shown` and `recap.ready`, drop "transfer targets". Spec 002: seven tools, the recap is in scope, `filler_recap`, `texture_preference`. Spec 003: ten record rows, the `tutorials` and `recap` contract fields.
- Delete `specs/v0/plan.md` and `tasks.md` (done; git keeps them) after updating the five places that point to them (`backend/app/agents/prompts.py`, `context/decisions.md`, `specs/README.md`, specs 001 and 002).
- Update the status line in `AGENTS.md`.

## Ideas (data the conversation could collect)

Thomas, 2026-10-05: what matters to L'Oréal is the data a conversation can collect. Two more questions, not scheduled:
- Where the products should go: shipping address area or the store the visitor would visit (location intent, for retail and supply chain).
- Where the visitor usually buys (pharmacy, supermarket, online, department store).

## Claims risk to watch

In 2 of about 10 live runs on 2026-10-05, the expert presented a product with words beyond its approved claims ("reduces wrinkles" for a cream whose claims are "does not leave the skin feeling greasy" and "two types of hyaluronic acid"), or gave usage advice no note holds. The golden tests catch it; the prompt now asks for the claim word for word. If it shows up in rehearsal, check the presentation turn the way diagnosis replies are checked.

## Refactoring (after the event)

- **Mic on the audio thread.** Capture uses `ScriptProcessorNode` (deprecated), whose callback and the base64 encoding run every 64 ms on the main thread that also renders the screen; a busy screen can delay it and drop audio, so the transcription misses a word. Move capture to an `AudioWorklet` with a worker that converts and sends the audio (`frontend/src/lib/mic.ts`, `utterance.ts`, the listening part of `voice-engine.ts`, one worklet file, build config). Medium, about half a day with a live mic and the fake-mic browser test. Wait: it rewrites the capture that ran live at Decathlon and works today; do it sooner only if a live check shows dropped words.
