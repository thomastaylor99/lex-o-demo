# V0: tasks

> Plan: `specs/v0/plan.md`. Specs: `specs/001-voice-core/spec.md`, `specs/002-discovery/spec.md`, approved 2026-10-04.

| # | Task | Lane | Needs | Owner | Status | Evidence |
|---|---|---|---|---|---|---|
| S1 | Spike: realtime STT on `mistralai` 3.0.0 | spikes | | subagent | done | `spikes/2026-10-04-realtime-stt/README.md`: realtime-3, final text 0.2 s after `end`, `context_bias` via raw `session.update`, no language event |
| S2 | Spike: TTS latency, streamed format, voices in both languages | spikes | | subagent | done | `spikes/2026-10-04-tts/README.md`: 2603 streamed PCM, first sound about 0.5 s; stalls need a first-chunk timeout |
| S3 | Spike: chat engine latency, forced call, extraction, switch history | spikes | | subagent | done | `spikes/2026-10-04-chat-engine/README.md`: small first token about 0.3 s, forced call 0.45 s, extractor on small 97.7% |
| R1 | Product shortlist research | data | | subagent | done | `specs/002-discovery/perimeter.md` |
| T1 | Backend scaffold | A | | subagent | review | 19 tests pass, ruff clean; `mistralai` 3.0.0 on Python 3.14.2 |
| T2 | Contracts: events, stream, agent interfaces | A | T1 | subagent | review | contract files diffed against the plan |
| T3 | Catalogue models, basket, store, fixture | B | T1 | subagent | review | 22 passed, 1 skipped (`test_real_catalogue` waits for T20) |
| T4 | Beauty profile and merge | B | T3 | subagent | review | `test_profile.py` passes |
| T5 | Sessions | A | T3, T4 | subagent | review | `test_session.py` passes |
| T6 | Tool-call accumulator | A | T2 | subagent | review | `test_accumulate.py` passes |
| T7 | Conversation loop | A | T2, T5, T6 | subagent | review | 13 loop tests pass; plan code unchanged |
| T8 | Mistral streamer | A | T2, S3 | subagent | review | 10 tests; live: first delta 252 ms, forced transfer 390 ms |
| T9 | Ranking | B | T3 | subagent | review | 6 ranking tests pass |
| T10 | Tools | B | T2, T5, T9 | subagent | review | 17 tool tests pass; live API accepted the five schemas and called `search_products` correctly |
| T11 | Agents, prompts, voices | B | T10, S2 | subagent, Thomas picks voices | review | 38 tests; default voices until Thomas picks |
| T12 | Profile extractor | B | T2, T4, S3 | subagent | review | 14 tests pass; live: 0.62 to 0.74 s per exchange, sister trap ignored |
| T13 | Speech to text bridge and language | C | T2, S1 | subagent | review | live: brand names right in EN and FR, final text 0.21 s after end |
| T14 | Speech output and fixed lines | C | T2, S2 | subagent | review | live: first chunk 0.44 to 0.57 s; retry recovered a stall |
| T24 | Terminal voice client, first milestone | join | T7, T8, T10 to T14 | subagent, Thomas tests | done | Thomas tested by voice on 2026-10-04: it works; silent scripted run: first audio 0.5 to 0.9 s, TTS hedging on |
| T15 | API wiring | join | T7, T8, T10 to T14, T24 tested | subagent | doing | |
| T16 | Frontend scaffold, events.ts, api.ts | D | T2 (from the plan's contract text) | subagent | done | spec and quality reviews passed after fixes; lint, tsc and build pass (Next.js 16.3.8, React 19.2.8) |
| T17 | Voice hook port | D | T16 | subagent | doing | moved into V1 (spec 003): the engine behind the designed screen |
| T18 | Debug page | D | T17 | subagent | dropped | Thomas went straight to the V1 screen (spec 003); `?mock=1` covers design work |
| T19 | Perimeter approval | E | R1 | Thomas | done | Thomas approved all 13 products on 2026-10-04 (`specs/002-discovery/perimeter.md`) |
| T20 | Catalogue data | E | T3, T19 | subagents | done | 13 products, claims in EN and FR, `problems()` empty; claims for 11 product-languages copied from retailer pages, to check against brand pages before 2026-10-07 |
| T21 | Golden conversations | join | T15, T20 | subagent | deferred | Thomas: make it work first, tests later |
| T22 | Spoken run and latency evidence | join | T15, T18 | Thomas with main session | done in terminal | Thomas tested by voice on 2026-10-04; browser run comes with V1 |
| T23 | Docs | join | T21, T22 | subagent | todo | |

Status values: todo, doing, review, done. Evidence: a test name, a `scripts/verify` verdict or a screenshot path.

## Order

Thomas asked on 2026-10-04 to test the flow and the voices in a terminal before the browser, so T24 is the first milestone and the frontend waits for it.

1. T1 and T2 first: the contracts unlock every lane. T16 (frontend scaffold) ran alongside and is done.
2. Backend to the terminal: T3 to T6, then T7, T8, T9, T10, T11, T12; T13 and T14 alongside; T19 and T20 as soon as the shortlist is back.
3. T24: Thomas tests the flow, voices and timing in the terminal.
4. Then T15, T17 and T18, then T21 and T22 side by side, then T23.
