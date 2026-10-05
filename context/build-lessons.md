# Build lessons

> Source: problems met while building this repo on 2026-10-04, from the build sessions with Thomas, checked against the files named where one holds the fact. Last updated 2026-10-05.

What building this repo taught, so nobody pays twice. Each bullet gives the fact, then what to do. The Mistral facts come from `mistralai` 3.0.0: confirm them in Docstral before reuse.

## Subagents

- An agent that writes one large file goes silent, and the watchdog kills it after 10 minutes: four of five template agents died this way in the first round. Give each agent one component per file, under 150 lines, written one file at a time. In the second round all five agents finished in 8 to 12 minutes.
- Small files are not enough on their own. In the third round (voice-bar templates, 2026-10-05) two of five agents read the files their brief listed, then went silent before writing anything, and the watchdog killed them; the other three took 17 to 33 minutes. Write the shared pieces before dispatch so each agent builds only its own part, and build a stalled agent's part directly.
- Two sessions working in the same folder see each other's unfinished files, including through the Stop hook. Give a parallel stream its own worktree (`git worktree add -b <branch> .claude/worktrees/<name> main`, then `EnterWorktree` with that path). A new worktree has no `node_modules`; when `npm ci` refuses an out-of-sync lock file, `cp -c -R` the main folder's `frontend/node_modules` (an APFS clone, a few seconds). Copy `.env` too.
- Two agents running `next build` or `next dev` at once collide. Parallel agents check their work with `tsc --noEmit` and eslint.
- The Stop hook runs `scripts/verify --quick` after any turn that changed files, so it also fails on the unfinished files of agents still working. Leave those files to their owner.

## Screenshots

- Headless Chrome fast-forwards the scripted mock (`?mock=1`) and saves a screenshot:
  `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --user-data-dir=<own dir> --window-size=1920,1080 --virtual-time-budget=<ms> --screenshot=<file> <url>`
- Give each instance its own `--user-data-dir`. The processes linger after the screenshot: kill them by PID.
- The permission settings refused remote debugging (CDP), so `--screenshot` is the way.
- Virtual time does not run CSS transitions and animations like real time: a capture can freeze a fade halfway, or run ahead and miss a short effect such as a handover ring. The flags `--disable-threaded-animation --run-all-compositor-stages-before-draw` make some effects show and freeze others. To check motion, take real-time screenshots with Playwright on the system Chrome, from `frontend/`: `node -e` with `require('@playwright/test').chromium.launch({ channel: 'chrome' })`, `page.waitForTimeout`, `page.screenshot`.

## Next.js 16

- Run `next typegen` before `tsc --noEmit`: it writes the `PageProps` and `LayoutProps` globals. `scripts/verify` does it.
- `searchParams` is a Promise: await it in the page (`frontend/src/app/page.tsx`).
- Read state from the URL with `useSyncExternalStore` (`frontend/src/templates/useDemoAgent.ts`). It avoids hydration mismatches and the `react-hooks/set-state-in-effect` lint rule.

## Mistral voice

- TTS first chunks sometimes stall, for up to 10 s: hedge the request (`backend/app/voice/tts.py`, `spikes/2026-10-04-tts/README.md`).
- The speech API keeps no context between requests, so one request per sentence restarts the intonation each time. Send the whole reply: on tts-3 the first chunk came as fast for three sentences as for one (median 403 ms against 433 ms, 6 runs each, 2026-10-05).
- The SDK's default HTTP client drops idle connections after 5 s; pass an `httpx.AsyncClient` with a longer `keepalive_expiry` as `async_client`, and close it yourself (`backend/app/main.py`).
- The model writes markdown unless told otherwise, and its bold text was read aloud. Ask for plain text in the prompt and strip markdown before TTS.
- Realtime STT's `usage.prompt_audio_seconds` reads 2 or 3 s whatever the clip length. Meter STT from the audio bytes sent: 16 kHz mono 16-bit makes 32,000 bytes per second (`spikes/2026-10-04-realtime-stt/README.md`, gotcha 10).
- `context_bias` has no SDK parameter: send it in a raw `session.update` frame before the first audio. Only realtime-3 accepts it; the 2602 fallback answers with an error and closes the socket (`backend/app/voice/stt.py`).
- In chat streaming, usage arrives on the last chunk (`spikes/2026-10-04-chat-engine/README.md`).
- The profile extractor over-inferred hydration until its prompt said that asking for a product names no concern (`backend/app/profile/extractor.py`).

- A rule in the system prompt can lose to the model's urge to help with products (the eczema referral failed 2 of 3 runs). A one-line note added to the turn context when keywords match made it hold (3 of 3). Prefer that for safety rules.
- Observers finish mid-turn but their events go out at its end; anything a tool changed in between must be read again when the event is sent (`UiEvent.latest`).

## Environment

- Kandji sets uv's exclude-newer to 2 days and npm's min-release-age, so npm's warning is expected (`AGENTS.md`, Environment notes).
- Run uv commands from `backend/`, where `pyproject.toml` lives.
- Serve the backend on 8000 (`uv run uvicorn app.main:app --port 8000` in `backend/`) and the frontend on 3100 (`npm run dev -- --port 3100` in `frontend/`). Keep 3100 in the backend's CORS origins (`backend/app/settings.py`).
- Test the voice in the terminal, with headphones: `cd backend && uv run python scripts/talk.py --mode ptt|auto|text` (`README.md`).

## Git

- The agent cannot commit: a guard hook in Thomas's user settings blocks git writes. Thomas commits.
- Stage everything before committing (`git add -A`, then `git status`). Some files had been staged earlier, so the first commit (`9565a90`) left out `backend/`, `frontend/` and `spikes/`; they went into a second one (`6ea0df3`).
