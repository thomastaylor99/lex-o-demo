# 001 Voice core

> Status: approved 2026-10-04. Owner: Thomas. Last updated: 2026-10-04.

## Goal

A visitor speaks in the browser and hears the active agent answer fast, with every stage timed. This stream ports the Decathlon pipeline to `mistralai` 3.0.0, replaces its agent loop with our own loop over chat completions, switches agents in code, and fixes the stream event contract every other stream builds on. V0 ships it behind a bare debug page; spec 003 builds the real screens on the same contract.

## Success criteria

- A spoken run of the 002 golden path (at least 10 turns) in the browser gives a median time to first audio under 2 s with push-to-talk and under 2.5 s with automatic end of speech (whose silence wait counts), with the stage breakdown of every turn in the debug page and in the backend log.
- On the handover turn (concierge to skincare), first audio plays within 1.5 s of end of speech with push-to-talk.
- Live transcription: the visitor's words appear on screen while they speak, the first ones within about half a second, and the final text replaces the partial one at end of speech. The agent's reply appears sentence by sentence, in step with its voice.
- When the visitor switches from English to French, the next reply is spoken in French; switching back works the same way.
- Push-to-talk and automatic end of speech both work.
- Unit tests cover event serialisation, tool-call accumulation, the agent switch and the tool-round cap; `scripts/verify` passes.

## Scope

In scope (V0):
- Realtime STT bridge over WebSocket, with `context_bias` if the spike shows realtime accepts it.
- The conversation loop: streaming, tool execution, agent switch, per-stage timings.
- The agent and tool interfaces the loop reads (002 supplies the content).
- TTS per sentence in the active agent's voice and the session language, plus a startup cache of fixed lines per agent and language (welcome, clarify, handover, search filler).
- In-memory sessions: create, end, expire after 30 minutes.
- A terminal voice client (`backend/scripts/talk.py`) that runs the same loop, STT and TTS in-process with the laptop's mic and speakers. Thomas tests the flow, the voices and the timing there first, before the browser.
- The Next.js app with the ported voice hook and one bare page.

Out of scope: designed screens, cards and the latency display (003); presenter keys, reset between volunteers and fallbacks (005); barge-in and the Voice Agents SDK (deferred in 000); camera (004).

## Design

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/sessions` | New session: `session_id`, active agent, language, welcome line id |
| DELETE | `/sessions/{id}` | End a session and drop its state |
| GET | `/sessions/{id}/usage` | The session's running cost: `cost_eur`, split into `llm_eur`, `stt_eur` and `tts_eur`, with the tokens by model, `stt_seconds` and `tts_characters` behind it |
| WS | `/ws/transcribe` | Query: `language` (the default when the text cannot tell) and an optional `session_id`, whose usage counts the audio. In: base64 PCM (16 kHz mono `pcm_s16le`) and `end`. Out: transcript deltas, then the final text with language and `stt_final_ms` |
| POST | `/conversation/stream` | In: `session_id`, `text`, `language`. Out: SSE events for one turn |
| POST | `/voice/speak` | In: `agent`, `language`, `text`, and an optional `session_id`, whose usage counts the characters. Out: streamed PCM (float32, 24 kHz, mono) in that agent's voice. Voice ids stay server-side |
| GET | `/voice/lines/{agent}/{line}/{language}` | A cached fixed line, same PCM format |
| POST | `/turns/{turn_id}/timings` | Browser-side timings, logged with the backend ones |
| GET | `/config` | Agents (id, display name, role label, line ids), the languages and the first agent, for the page |
| GET | `/health` | Liveness and whether the Mistral key is set |

### Stream event contract

SSE frames `event: <type>` with a JSON body carrying `type`, `turn_id` and `t_ms` (milliseconds since `turn.started`). One Pydantic model per event in `backend/app/conversation/events.py`, mirrored once in `frontend/src/lib/events.ts`.

| Event | Payload |
|---|---|
| `turn.started` | `agent`, `language` |
| `text.delta` | `agent`, `text` |
| `tool.started` | `call_id`, `name`, `args` |
| `tool.finished` | `call_id`, `name`, `ok`, `duration_ms` |
| `line.play` | `agent`, `line` (a fixed line id: handover, clarify, search filler) |
| `agent.switched` | `from_agent`, `to_agent` |
| `products.shown` | `products`, `best_match_id` (schema owned by 002) |
| `basket.updated` | `items`, `total_eur` (schema owned by 002) |
| `profile.updated` | `profile` (schema owned by 002) |
| `turn.done` | `timings`: first token per model call, each tool's duration, `total_ms`; `cost_eur`: the session's running cost so far, in euros (0.0 by default) |
| `error` | `message`, `recoverable` |

### Timings

The browser records `speech_end` (last voiced frame, or the push-to-talk release), `stt_final`, `request_sent`, `first_delta`, `first_sentence`, `first_audio` (first sample played; filler and handover lines count and are flagged). Time to first audio is `first_audio - speech_end`. The page shows each turn's breakdown and posts it to `/turns/{turn_id}/timings`; structlog writes one line per turn with both sides. Logs hold timings and text only.

### Running cost

Each session carries a usage meter (`backend/app/usage/`). Prices are in euros by model id in `backend/app/usage/pricing.py`, with their source and date; the realtime-3 transcription price is a placeholder until Thomas confirms it. The meter counts the chat tokens from the usage on each streamed call's last chunk and on the profile extractor's response; the speech-to-text seconds from the audio bytes the bridge forwards (32,000 a second), since the realtime `usage.prompt_audio_seconds` read 2 or 3 whatever the clip length; and the text-to-speech characters of every request started, hedges included, since each one is billed. Fixed lines are synthesised once at startup and cost no session anything. `turn.done` carries the total so far. Once a turn's audio has played, the browser reads `GET /sessions/{id}/usage` to add that turn's speech, and it keeps the highest total it has seen for the current session.

### Conversation loop

`backend/app/conversation/loop.py`, ported from the streaming loop in the reference `agents.py`, rewritten for `client.chat.stream_async`:
1. Messages: the active agent's instructions, the history, and a context block (reply language, profile, basket) as a system message just before the latest visitor message. Everything before that block stays byte for byte the same from turn to turn, so Mistral's prompt cache reuses it.
2. Call with the agent's tools and its `tool_choice` for this turn. The concierge forces `transfer_to_agent`.
3. Stream text deltas. Accumulate tool-call fragments by index; when a call is complete, validate its arguments, run the handler, emit its events, append the result, and call the model again.
4. A tool result may name an agent to switch to, a fixed line to play, and whether the turn ends there. On a switch the loop sets `session.active_agent`, emits `agent.switched`, then runs the new agent's first reply inside the same turn. The transfer call and its result leave the history; the summary goes into the new agent's context block.
5. When a tool listed in the agent's `tool_fillers` starts before the agent has said anything in this turn, the loop emits `line.play` with that filler.
6. At most three tool rounds per agent per turn; the next call then runs with `tool_choice="none"`.

The loop imports no catalogue, brand or prompt module. The realtime model sends no language event (STT spike), so a local detector restricted to English and French reads the final transcript, defaulting to the session language.

### Agent and tool interfaces

`AgentConfig`: id, display name, role label, model, instructions (English; the context block names the reply language each turn), tools, `tool_choice` policy, `tool_fillers`, voice per language, fixed lines per language, transfer targets, and a context block renderer. `Tool`: name, description, a Pydantic argument model, and a handler `(session, args) -> ToolResult`. `ToolResult` holds the content for the model, the events for the browser, and optionally an agent to switch to, a fixed line to play and an end of turn. Turn observers (the 002 profile extractor) start with each turn and their events go out before `turn.done`. 002 provides the configs, tools and observers.

### Speech output

The browser splits the streamed text at sentence ends (reference rule), requests `/voice/speak` for each sentence ahead of playback, and schedules the streamed PCM chunks back to back with Web Audio. The TTS spike measured first sound at about 0.5 s streamed, against 1.2 to 1.9 s for a whole WAV. About one request in ten stalls before its first chunk, sometimes for 10 s, so the backend hedges: when a request has delivered no audio after 0.9 s (`tts_hedge_after_s`), it races another one against it, up to 3 requests in all (`tts_max_attempts`), each given 5 s for its first chunk (`tts_first_chunk_timeout_s`). The first to deliver audio wins and the others are cancelled; a request that fails is replaced at once. Startup synthesises the fixed lines, which also opens the TTS connection. On `line.play` the browser plays the cached fixed line at once; the welcome line plays when a session starts. The backend decides every fixed line, so the browser holds no journey rules. The mic is muted while the agent speaks (no barge-in in V0).

### Frontend V0

`frontend/` from `create-next-app` (Next.js 16). Port `useVoiceAgent.ts` and `audio-utils.ts` from the reference with the Decathlon types replaced by `events.ts`. One page `/`: start and end session, mic mode (automatic, push-to-talk), a transcript labelled by speaker and agent where the visitor's words appear live as they speak, an event log with timings, profile and basket as JSON. No styling work; 003 keeps live transcription as a visible feature of the designed screens.

### Models

STT `voxtral-transcribe-realtime-3` (fallback `voxtral-mini-transcribe-realtime-2602`), agents `mistral-small-latest`, TTS `voxtral-mini-tts-2603` streamed as PCM (`spikes/2026-10-04-tts/README.md`), all set in `backend/app/settings.py`. The spikes in `spikes/2026-10-04-realtime-stt/`, `-tts/` and `-chat-engine/` fix the final values, recorded here. Docstral reference: `mistralai` 3.0.0, Python, sections `realtime_audio`, `speech_generation`, `chat_streaming`, `tool_calling`, `structured_output`.

## Risks and fallbacks

- Realtime-3 misbehaves on the day: switch to `voxtral-mini-transcribe-realtime-2602` in settings.
- The chat API answers 503 in bursts (11 of 40 calls in one minute during the spike): the streamer retries once when nothing has streamed yet, then falls back to `mistral-medium-latest`.
- `context_bias` has no SDK parameter in 3.0.0: the bridge sends it as a raw `session.update`, which realtime-3 accepts (spike: "Lancôme Hydra Zen" right in 3 of 3 runs with it, misheard without). If that path breaks, brand names stay in the agents' instructions.
- Automatic end of speech waits 700 ms of silence (the reference waited 1.5 s, which the STT spike found was most of the delay); push-to-talk has no wait.
- Room noise or speaker echo triggers the mic: push-to-talk.
- Slow office network: the timings show which stage; push-to-talk removes the silence wait.

## Verification

- Unit: event round trip, tool-call fragment accumulation, agent switch keeps history and changes tools and voice, three-round cap, the cost maths.
- Manual: the spoken golden-path run, with its timings table pasted into `tasks.md` as evidence.
- `scripts/verify` passes.

## Open questions

- The end-of-speech mode used on the day: 005 decides; V0 supports both.
- Whether each agent keeps one voice across languages: the TTS spike samples decide.
