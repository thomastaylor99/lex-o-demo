# V0: tasks

> Plan: `specs/v0/plan.md`. Specs: `specs/001-voice-core/spec.md`, `specs/002-discovery/spec.md`, approved 2026-10-04.

| # | Task | Lane | Needs | Owner | Status | Evidence |
|---|---|---|---|---|---|---|
| S1 | Spike: realtime STT on `mistralai` 3.0.0 | spikes | | subagent | doing | |
| S2 | Spike: TTS latency, streamed format, voices in both languages | spikes | | subagent | doing | |
| S3 | Spike: chat engine latency, forced call, extraction, switch history | spikes | | subagent | doing | |
| R1 | Product shortlist research | data | | subagent | doing | |
| T1 | Backend scaffold | A | | subagent | todo | |
| T2 | Contracts: events, stream, agent interfaces, languages | A | T1 | subagent | todo | |
| T3 | Catalogue models, basket, store, fixture | B | T1 | subagent | todo | |
| T4 | Beauty profile and merge | B | T3 | subagent | todo | |
| T5 | Sessions | A | T3, T4 | subagent | todo | |
| T6 | Tool-call accumulator | A | T2 | subagent | todo | |
| T7 | Conversation loop | A | T2, T5, T6 | subagent | todo | |
| T8 | Mistral streamer | A | T2, S3 | subagent | todo | |
| T9 | Ranking | B | T3 | subagent | todo | |
| T10 | Tools | B | T2, T5, T9 | subagent | todo | |
| T11 | Agents, prompts, voices | B | T10, S2 | subagent, Thomas picks voices | todo | |
| T12 | Profile extractor | B | T2, T4, S3 | subagent | todo | |
| T13 | Speech to text bridge and language | C | T2, S1 | subagent | todo | |
| T14 | Speech output and fixed lines | C | T2, S2 | subagent | todo | |
| T15 | API wiring | join | T7, T8, T10 to T14 | subagent | todo | |
| T16 | Frontend scaffold, events.ts, api.ts | D | T2 | subagent | todo | |
| T17 | Voice hook port | D | T16 | subagent | todo | |
| T18 | Debug page | D | T17 | subagent | todo | |
| T19 | Perimeter approval | E | R1 | Thomas | todo | |
| T20 | Catalogue data | E | T3, T19 | subagents | todo | |
| T21 | Golden conversations | join | T15, T20 | subagent | todo | |
| T22 | Spoken run and latency evidence | join | T15, T18 | Thomas with main session | todo | |
| T23 | Docs | join | T21, T22 | subagent | todo | |

Status values: todo, doing, review, done. Evidence: a test name, a `scripts/verify` verdict or a screenshot path.

## Order

1. T1 and T2 first: the contracts unlock every lane.
2. Then in parallel: T3 to T6 in lanes A and B, T16 in lane D, and T19 as soon as the shortlist is back.
3. Then T7 to T14 as their inputs land, T17 and T18 on the frontend, T20 once the perimeter is approved.
4. Join: T15, then T21 and T22 side by side, then T23.
