# L'Oréal Learning Expedition voice demo

Voice product-discovery demo for the L'Oréal Learning Expedition on 2026-10-07.

Start with `AGENTS.md`: layout, workflow and rules, for agents and people alike. Inputs live in `context/`, work is planned in `specs/`, and `scripts/verify` gives the verdict.

Where things stand: `context/handover.md`. How it is built: `specs/v2/architecture.md` (diagrams, agents, models, design system). Why: `context/decisions.md`.

## First-time setup

1. Install Docstral, the MCP server for Mistral SDK docs: `curl -fsSL https://docstral-mcp.solutions.mistralsol.com/install.sh | sh`, then `claude mcp login docstral`. Approve the `docstral` server from `.mcp.json` when Claude Code asks.
2. Copy `.env.example` to `.env` and fill in `MISTRAL_API_KEY`.
3. Check that the Decathlon reference export exists at the path in `.claude/settings.local.json`. `context/reference-map.md` has the command to recreate it.
4. Run `scripts/verify`.

## Run the browser app

Backend, from `backend/`:

```
uv run uvicorn app.main:app --port 8000
```

Frontend, from `frontend/`:

```
npm install                 # once
npm run build
npx next start -p 3100
```

Open http://localhost:3100 in Chrome, click Begin and allow the microphone.

- `?mock=1` plays the scripted conversation on the same screen, with no backend.
- `?camera=1` shows the camera switch in the header (the V2 camera slot).
- `?autostart=1` skips the welcome screen, for rehearsals. Chrome may hold the audio until the page gets a click.
- Restart, in the header, ends the conversation and returns to the welcome screen for the next visitor.
- The frontend calls the backend at `NEXT_PUBLIC_API_URL` (default http://localhost:8000). Set it before `npm run build`, which bakes it into the bundle.
- The UI templates stay under http://localhost:3100/templates, and the welcome mockups under http://localhost:3100/welcome.

## Test the voice flow in the terminal

From `backend/`:

```
uv sync                                     # once: Python 3.14 and the dependencies
uv run python scripts/talk.py --mode ptt    # Enter to talk, Enter to stop
uv run python scripts/talk.py --mode auto   # ends your turn after 600 ms of silence
uv run python scripts/talk.py --mode text   # type the visitor's lines instead of speaking
```

- Headphones help: the mic pauses while the agents speak, but laptop speakers can still reach it in `auto`.
- On the first run, macOS asks to allow microphone access for your terminal app.
- If `auto` misses quiet speech or never ends your turn, tune `--vad-threshold` (default 500, printed at start; lower hears quieter speech).
- `--lang fr` starts in French, `--verbose` adds the speech timing of every sentence, Ctrl+C ends the session.
- After each turn a timings line gives milliseconds from the end of your speech: `stt_final` (transcript ready), `first_token`, `first_sentence`, `first_audio` (a fixed line or speech).
- `tts_hedge` warnings are the speech race at work: a slow request got a second one raced against it.
