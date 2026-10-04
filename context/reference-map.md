# Reference map: the Decathlon voice demo

> Source: `~/Documents/Projects/decat/demo` at commit `a328679` (2026-09-20), exported read-only to `/Users/thomas.taylor/Professional/Pre Sales/Retail/loreal/decathlon-reference`. Curated 2026-10-04.

The export holds 26 of the repo's 118 tracked files, the ones worth reading. Stale design docs, exploration pages, sports data and tests were left out on purpose. Read it through an Explore subagent and bring back only the excerpts a task needs.

## Port, then adapt

| File | What it is | What to take |
|---|---|---|
| `frontend/src/hooks/useVoiceAgent.ts` | The browser voice loop: mic capture, realtime STT over WebSocket, SSE parsing, TTS prefetch queue, agent modes, cost counter | The whole loop; strip the product, store and order types |
| `frontend/src/lib/audio-utils.ts` | `playAudioBase64` | As is |
| `api.py` | FastAPI app: `/ws/transcribe`, `/conversation/stream`, `/voice/speak`, `/voice/transcribe`, `/config` | The voice and stream endpoints; leave `/tools/*` and the Decathlon card extraction |
| `agents.py` | Streaming conversation loop, five hardcoded sport agents, handoff fallback | The loop, with one agent config in place of the five agents and without the handoff code |

## Read as patterns

| File | Pattern worth copying |
|---|---|
| `tools.py` | Tool schema, handler and `execute_tool` dispatcher; an HTML recap email builder |
| `models.py` | Pydantic catalogue models |
| `prompts/sport_advisor.py` | Voice output rules and conversational qualifying questions; the sports content is irrelevant |
| `frontend/src/components/transcript/` | Rendering pipeline steps: messages, tool calls, handoffs |
| `frontend/src/components/visualizer/` | Audio-reactive visualisers: orbs, pixel bar, voice bar |
| `frontend/src/lib/mock-data.ts`, `types.ts`, `agent-profiles.ts` | A scripted mock conversation and typed UI data, for building screens before the backend is ready |
| `frontend/src/lib/constants.ts` | The Mistral design system easing curve |
| `frontend/AGENTS.md` | The Next.js 16 rules block that `create-next-app` generates |

## Left out, and why

- `context/` design docs: partly stale (batch pipeline, three agents). Verified facts moved to `voice-lessons.md`.
- `frontend/src/app/conversation-ui/`, `orbs/`, `ui-redesign/`: design exploration pages.
- `data/` and `tests/`: the sports catalogue and the tests tied to it.
- `cli.py` and `audio.py`: terminal-only mode.

## Recreate the export

```bash
git -C ~/Documents/Projects/decat/demo archive --prefix=decathlon-reference/ a328679 \
  api.py agents.py tools.py models.py prompts \
  frontend/src/hooks frontend/src/lib frontend/src/components/transcript \
  frontend/src/components/visualizer frontend/AGENTS.md \
  | tar -x -C "$HOME/Professional/Pre Sales/Retail/loreal/"
```
