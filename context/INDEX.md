# Context index

> Source: maintained by hand. Last updated 2026-10-06.

Read-only inputs for agents. Each file opens with a `> Source:` line naming where it comes from and when. To add an input: write it as markdown, add the source line, add a row below. Agents change these files only when Thomas asks.

| File | Holds | Read it when |
|---|---|---|
| `handover.md` | The state at v2: versions, what changed since V1, how a conversation runs, risks for the dry run, open items, how to run and restart, how to work with Thomas, the repository's branches | Starting any session |
| `brief.md` | Event, audience, demo slot, why voice, constraints, open questions | Starting or scoping any spec |
| `glossary.md` | L'Oréal divisions and programmes, brand names that seed speech-to-text `context_bias`, demo vocabulary | Writing prompts, STT config or catalogue data |
| `claims-policy.md` | Where product claims come from and how the agent may voice them | Touching prompts, tools, catalogue or tests |
| `voice-lessons.md` | Facts and pitfalls verified in the Decathlon build, with file and line references | Touching STT, TTS, streaming or the agent loop |
| `reference-map.md` | What each file in the Decathlon reference export is good for, and how to recreate the export | Before opening the reference |
| `decisions.md` | Decisions taken so far, by theme, each with its date, reason and pointer to the detail; the decisions still open | Starting a session, revisiting a choice, or recording a new one |
| `build-lessons.md` | What building this repo taught: subagents, screenshots, Next.js 16, Mistral voice facts, environment, git | Dispatching subagents, taking screenshots, touching the voice pipeline or committing |
