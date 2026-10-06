# L'Oréal Learning Expedition voice demo

Voice product-discovery app shown live at the L'Oréal Learning Expedition on 2026-10-07 (Mistral office, 20-minute hands-on slot). A visitor talks to a beauty concierge, who hands over to a specialist agent (skincare first). The specialist asks a few questions, calls tools over a small catalogue of real products, and answers by voice while product cards appear on screen. Live voice cloning is a separate opener and stays outside this repo.

What matters on the day, in order: it works every time, it answers fast (voice latency is the blocker L'Oréal named for Beauty Genius), and every claim it speaks traces back to the catalogue.

Owner: Thomas Taylor. Status: v2, demo-ready, tagged `v2` on `main` (2026-10-06). A new session starts with `context/handover.md`: the state, what changed since V1, the risks and how to carry on. Run commands are in `README.md`.

## Read first

@context/INDEX.md

- `context/handover.md` first, then `specs/v2/architecture.md` for the system as built.
- `context/` holds read-only inputs, each opening with its source and date. Search it and open only what the task needs.
- `specs/` holds one folder per stream of work. The active spec defines scope. `specs/000-architecture/spec.md` holds the decisions that frame every stream.
- The Decathlon voice demo is the reference implementation, exported read-only to `/Users/thomas.taylor/Professional/Pre Sales/Retail/loreal/decathlon-reference`. Read `context/reference-map.md` first, then have an Explore subagent bring back only the excerpts the task needs. Decathlon names, data and styling stay out of this repo.

## Layout

```
AGENTS.md          this file, kept under 150 lines
CLAUDE.md          imports this file for Claude Code
context/           read-only inputs, indexed in context/INDEX.md
specs/             one folder per stream: spec.md, plan.md, tasks.md; v0/ and v2/ per version
backlog.md         fixes, cleanup and refactoring found but not scheduled
backend/           FastAPI app, catalogue data, tests (spec 001)
frontend/          Next.js app with its own AGENTS.md (spec 001)
spikes/            throwaway experiments
scripts/verify     the verdict: every check that applies
.claude/           settings, Stop hook, project skills
.mcp.json          Docstral MCP server
```

## Commands

- `scripts/verify` runs every check that applies to what exists today.
- `scripts/verify --quick` skips the frontend build and anything that calls a paid API. The Stop hook runs this one.
- `scripts/verify --golden` adds the golden conversations, which call the live Mistral API.

## How we work

1. One spec per session. Follow `specs/README.md`: brainstorm, write `spec.md`, then `plan.md` and `tasks.md`, then build task by task.
2. Keep the main context for decisions. Exploration, reference reading and documentation lookups go to subagents. Run `/clear` between streams.
3. Parallel streams run in separate worktrees (`claude --worktree <name>`) once spec 001 has fixed the stream event contract and the product schema.
4. For audio capture, streaming and the conversation loop, port the reference code file by file, then adapt it. That code already survived a live demo.
5. Before reporting anything as done, run `scripts/verify` and show its verdict. The Stop hook also runs the quick checks after any turn that changed files, and sends failures back.
6. A change in behaviour updates its spec in the same change. Stale docs misled agents in the Decathlon repo.
7. Experiments live in `spikes/`. Code in `backend/` and `frontend/` never imports from there; a spike that works gets rewritten into the app under a spec.
8. Git: one branch per stream. Commits and pushes happen only with Thomas's explicit approval.
9. Significant decisions go into `context/decisions.md` in the same change: date, choice, reason, and a pointer to the spec that details it.

## Mistral SDKs: Docstral first

Docstral (MCP server `docstral`, declared in `.mcp.json`) serves versioned, agent-ready docs for Mistral's SDKs: `mistralai` (Python and TypeScript), `mistralai-agents`, `mistralai-voice-agents`, `mistralai-workflows`, `mistralai-ui`.

- Before writing or changing code that touches a Mistral SDK, model or audio API: call `list_docs`, pick the package and language, call `list_versions` when a version is pinned, then `fetch_doc` and the relevant `fetch_doc_section` calls.
- Docstral is the authority for imports, signatures, parameters and model IDs. `context/voice-lessons.md` records what worked with `mistralai` 2.4.13 in 2026; confirm each fact in Docstral before relying on it.
- If the Docstral tools are missing, stop and tell Thomas. Install with `curl -fsSL https://docstral-mcp.solutions.mistralsol.com/install.sh | sh`, then `claude mcp login docstral`.
- For other libraries (Next.js 16, React 19, FastAPI, Tailwind 4), use the context7 MCP. Next.js 16 changed its APIs: read `frontend/node_modules/next/dist/docs/` before writing Next.js code.

## Product rules for all code

- Latency is the headline. Time every stage (end of speech, final transcript, first token, each tool call, first audio) and carry the timings in the event stream.
- One conversation loop with function tools. Agents are configurations: the loop switches them after a forced `transfer_to_agent` call, so the model never executes a handoff itself. At Decathlon, model-driven handoffs misfired on about 30% of first turns and cost 2 to 3 seconds.
- Spoken replies: two or three short sentences, with prices, specs and lists left to the screen.
- Claims: the agent voices product benefits only from the catalogue's approved claims, quoted from the brand's product page. See `context/claims-policy.md`.
- Products, prices, shades and ratings are real and come from the catalogue, inside the perimeter Thomas sets.
- Visitor audio and images stay in memory. Logs hold timings and text transcripts only.
- Secrets live in `.env` (template: `.env.example`) and never reach logs, commits or the browser bundle.

## Code conventions

Python (`backend/`):
- Python 3.14, uv, FastAPI, Pydantic models at every boundary, structlog for logging (`print` is for scripts).
- Type hints on every function. ruff for lint and format, pytest for tests, both as dev dependencies. Register the pytest marker `golden`.
- Small modules with one purpose. The conversation loop knows nothing about brands or products; those live in agent config, tools and data.
- Detailed guide: the `python-best-practices` skill.

TypeScript (`frontend/`):
- Next.js 16 App Router, React 19, strict TypeScript, Tailwind 4.
- Stream event types are defined once and shared by the voice hook and the components.
- Mock data lives in dev fixtures and tests.

Tests:
- Unit tests cover tools, schemas and event serialisation.
- Golden conversations (`backend/tests/golden/`, marker `golden`) replay the demo script as text and assert structure: tools called, product IDs returned, claims within the approved list.

## Environment notes

- Kandji sets uv's `exclude-newer = "2 days"` and npm's `min-release-age=2`, so packages published in the last two days are invisible. For a fresh Mistral SDK release, use `uv sync --exclude-newer-package mistralai=<RFC 3339 timestamp>`. npm's warning about `min-release-age` is expected.
- Realtime speech-to-text expects 16 kHz mono PCM (`pcm_s16le`). Details in `context/voice-lessons.md`.
- Claude Code reads the reference through `permissions.additionalDirectories` in `.claude/settings.local.json`, which also denies edits there.

## Skills

- Project skills in `.claude/skills/`: `python-best-practices`, `code-review`.
- User-level skills: `docstral`, `frontend-design`, and the superpowers set (brainstorming, writing-plans, subagent-driven-development, verification-before-completion). Specs and plans those skills write go in the active `specs/<nnn>-<name>/` folder.
