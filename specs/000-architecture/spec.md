# 000 Architecture

> Status: approved 2026-10-04, amended the same day (engine, agents, models; see Changes). Owner: Thomas. Last updated: 2026-10-04.

## Goal

Frame every stream of the L'Oréal Learning Expedition demo: where the code lives, what it builds on, how agents work in it, and how work gets checked. Feature specs (001 onward) decide everything else.

The system as built at v2, with its diagrams, agents, models and design system, is described in `specs/v2/architecture.md`; V1's version is in git (`git show 50b09fe:specs/v1/architecture.md`).

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Repository | New repo at `~/Professional/Pre Sales/Retail/loreal/lex_demo` | A branch of the Decathlon repo would put 51 Decathlon-branded files, stale docs and exploration pages in every agent search. L'Oréal changes the domain, the design and the input modes, so little beyond the voice pipeline carries over. |
| Reference | Decathlon demo at `a328679`, 26 files exported read-only to `~/Professional/Pre Sales/Retail/loreal/decathlon-reference` | Agents learn a codebase by searching it. The export keeps only exemplar code within reach and stays fixed whatever happens to the original repo. |
| Agent context | `AGENTS.md` under 150 lines and imported by `CLAUDE.md`; read-only `context/` with an index; `specs/<nnn>-<name>/` per stream | Context is versioned with the code, small and high-signal. `AGENTS.md` is the open standard Vibe also reads (CNAM Sprint 1 blueprint). |
| Verification | `scripts/verify` gives one verdict; a Stop hook runs its quick checks after turns that changed files | Agents correct their own work before it reaches review. |
| Mistral SDK knowledge | Docstral MCP is the authority | The SDKs move faster than model training data and faster than our notes. |
| Backend | Python 3.14, uv, FastAPI, Pydantic, structlog | Same stack as the reference, so ported code runs with minimal change. |
| Frontend | Next.js 16, React 19, Tailwind 4; animations in plain CSS keyframes | Same reason. framer-motion was planned and never needed. |
| Voice pipeline | Ported from the reference: realtime STT over WebSocket, SSE conversation stream, TTS per sentence with a browser queue | Proven live, and latency is the selling point. |
| Conversation engine | Chat completions streaming (`client.chat.stream_async`, `mistralai` 3.0.0) with our own loop and history | Docstral documents streamed tool calls and forcing a named function in 3.0.0. It documents no way to switch agent or instructions inside a Conversations API conversation, and the stream events the reference loop used are absent from the 3.0.0 docs. Owning the history turns an agent switch into new instructions, tools and voice for the next call. |
| Agents | Several agent configurations in one loop: concierge and skincare in V0, haircare in V1. The concierge's model call is forced to `transfer_to_agent` and the loop performs the switch | At Decathlon, handoffs left to the model misfired on about 30% of first turns and cost 2 to 3 s. A forced call keeps the specialist story and removes the misfire. |
| Models | STT `voxtral-transcribe-realtime-3` (fallback `voxtral-mini-transcribe-realtime-2602`), agents and profile extractor `mistral-small-latest` (fallback `mistral-medium-latest`), TTS `voxtral-mini-tts-2603` streamed as PCM; all enabled on the key on 2026-10-04 | Brand names need biasing, but realtime `context_bias` is undocumented in 3.0.0, so a spike tests it. The chat spike measured small fastest for the agents (first token about 0.3 s) and most accurate for extraction. The TTS matches the cloning opener and streams its first sound in about 0.5 s. Details in `spikes/2026-10-04-*`. |
| Catalogue | 13 real products in JSON (perimeter approved 2026-10-04, `specs/002-discovery/perimeter.md`), Pydantic schemas with `approved_claims`, function tools over it | The whole catalogue fits in a tool result, and claims stay defensible. |
| Deferred until after 2026-10-07 | Voice Agents SDK (its Gemfury index answered 401 on 2026-10-04), vector search, handoffs executed by the Agents API, a package shared with Decathlon | Each costs time without serving the demo. Shared code waits for a third voice demo. |

## Streams

| Spec | Stream |
|---|---|
| 001 voice core | Ported pipeline, new models, per-stage timings, the stream event contract |
| 002 discovery | Agent config, tools, catalogue schema and data, claims enforcement, golden conversations |
| 003 journey and UI | Screens, the "how voice works" view, latency display, projector layout |
| 004 camera | Only if the discovery write-up keeps it, behind a switch |
| 005 show control | Presenter keys, reset between volunteers, fallbacks, handover from the cloning opener |

Spec 001 fixes the event contract and 002 fixes the product schema. After that, streams run in parallel worktrees. Versions V0 to V2 map onto these streams in `specs/README.md`.

## Changes

- 2026-10-04, evening: the catalogue row now says 13 products (the approved perimeter) and the frontend row drops framer-motion, which the build never used.
- 2026-10-04, after brainstorming V0 with Thomas: "Agent: Agents API, a single agent with function tools" became the two rows "Conversation engine" and "Agents". The visitor now meets a concierge who hands over to specialists, and the switch happens in code. Models gained the profile extractor and the spike checks.

## Sources

- Anthropic, Claude Code best practices: https://code.claude.com/docs/en/best-practices
- Anthropic, Effective context engineering for AI agents: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- Simon Willison, Hoard things you know how to do: https://simonwillison.net/guides/agentic-engineering-patterns/hoard-things-you-know-how-to-do/
- Thoughtworks Technology Radar, Anchoring coding agents to a reference application: https://www.thoughtworks.com/radar/techniques/anchoring-coding-agents-to-a-reference-application
- Martin Fowler, Patterns for Managing Source Code Branches: https://martinfowler.com/articles/branching-patterns.html
- Sandi Metz, The Wrong Abstraction: https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction
- CNAM Sprint 1 repo blueprint: `~/Professional/CNAM/slides-sprint1/v5/E-arborescence.html`
