# Voice lessons from the Decathlon build

> Source: Decathlon demo at commit `a328679` (2026-09-20), exported to `/Users/thomas.taylor/Professional/Pre Sales/Retail/loreal/decathlon-reference`, plus its design notes `context/ARCHITECTURE.md` and `context/archived/TECHNICAL.md` in `~/Documents/Projects/decat/demo`. Curated 2026-10-04. SDK details date from `mistralai` 2.4.13: confirm each one in Docstral before use.

## The pipeline that worked live

Browser mic → WebSocket `/ws/transcribe` → realtime speech-to-text → `/conversation/stream` (server-sent events) → Agents API conversation with function tools → TTS request per sentence → audio queue in the browser.

| Piece | What the reference does | Where (in the export) |
|---|---|---|
| Client | `from mistralai.client import Mistral` | `agents.py:9` |
| Realtime STT | `from mistralai.extra.realtime import RealtimeTranscription`, model `voxtral-mini-transcribe-realtime-2602`, `AudioFormat(encoding="pcm_s16le", sample_rate=16000)` | `api.py:19`, `api.py:37-38` |
| Browser capture | `AudioContext` at 16 kHz, Float32 samples converted to base64 PCM and sent over the WebSocket | `frontend/src/hooks/useVoiceAgent.ts:84`, `:178-182` |
| Upload fallback | `/voice/transcribe` strips the 44-byte WAV header and streams the PCM into the realtime API, which beats a file upload | `api.py:444-456` |
| Agent | `client.beta.agents.create`, then `client.beta.conversations.start_stream_async` and `append_stream_async`, model `mistral-small-latest` | `agents.py:63-127`, `:268-274` |
| TTS | model `voxtral-mini-tts-2603`, `response_format="wav"` | `api.py:39`, `:571-573` |
| Playback | TTS requests fire ahead and play back to back; text appears at sentence boundaries to stay in sync with speech | `frontend/src/hooks/useVoiceAgent.ts:304-345` |
| Voices | One voice per agent and language, default `en_paul_excited`, language set per session | `agents.py:28-50`, `:163-182` |

Stream event types the reference emits: `text_delta`, `tool_execution_started`, `tool_execution_done`, `tool_result`, `source_reference`, `handoff_started`, `handoff_done`, `usage`, `language`, `error`, `done`.

## Measured or observed

- TTS: about 90 ms processing, about 0.8 s end to end with PCM or WAV, about 3 s with MP3 (TECHNICAL.md).
- Handoffs: on about 30% of first turns, the greeter announced a specialist and the API did not execute the handoff. The code spots keywords and sends a synthetic "Yes, please connect me.", which adds 2 to 3 s (ARCHITECTURE.md; `agents.py:138-161`, `:297-306`).
- No barge-in: a visitor cannot interrupt the agent mid-speech.
- TTS has no speed parameter. Shorter replies were the only lever.
- Version 0 used invented products. They were replaced by 20 real ones because executives judge credibility on details.

## Prompt rules that held up

From `prompts/sport_advisor.py`:
- The agent knows it speaks through voice and a screen that shows product cards.
- Two or three conversational sentences per reply.
- Prices, weights, specs and feature lists stay on screen and are never read aloud.
- Qualifying questions are woven into the conversation. Checklist-style questions ("What terrain? What level? What budget?") felt robotic.

## What went wrong in the repo itself

- `ARCHITECTURE.md` drifted: it still described a batch pipeline and three agents while the code streamed in real time with five. Agents read it as current.
- About 40% of the frontend code (2,225 of 5,544 lines) was exploration pages left in `src/`.
- Skills sat in `skills/`, a folder Claude Code does not load, and were gitignored.

## New for L'Oréal, to confirm in Docstral

- `voxtral-transcribe-realtime-3` for speech-to-text, with `context_bias` for brand names (seed list in `glossary.md`).
- `voxtral-mini-tts-2603` stays the TTS: the voice-cloning opener uses it, and the newer TTS 3 checkpoint cannot clone yet.
- `mistralai-voice-agents` (LiveKit-based) exists and stays out of scope before the event.
