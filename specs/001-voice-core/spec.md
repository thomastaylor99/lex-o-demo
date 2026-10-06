# 001 Voice core

> Status: approved 2026-10-04. Owner: Thomas. Last updated: 2026-10-05.

## Goal

A visitor speaks in the browser and hears the active agent answer fast, with every stage timed. This stream ports the Decathlon pipeline to `mistralai` 3.0.0, replaces its agent loop with our own loop over chat completions, switches agents in code, and fixes the stream event contract every other stream builds on. V0 ships it behind a bare debug page; spec 003 builds the real screens on the same contract.

## Success criteria

- A spoken run of the 002 golden path (at least 10 turns) in the browser gives a median time to first audio under 2 s with push-to-talk and under 2.5 s with automatic end of speech (whose silence wait counts), with the stage breakdown of every turn in the debug page and in the backend log.
- On the handover turn (concierge to skincare), first audio plays within 1.5 s of end of speech with push-to-talk.
- Live transcription: the visitor's words appear on screen while they speak, the first ones within about half a second, and the final text replaces the partial one at end of speech. Each reply appears on screen when its text is complete, just before its voice.
- When the visitor switches from English to French, the next reply is spoken in French; switching back works the same way.
- Push-to-talk and automatic end of speech both work.
- Unit tests cover event serialisation, tool-call accumulation, the agent switch and the tool-round cap; `scripts/verify` passes.

## Scope

In scope (V0):
- Realtime STT bridge over WebSocket, with `context_bias` if the spike shows realtime accepts it.
- The conversation loop: streaming, tool execution, agent switch, per-stage timings.
- The agent and tool interfaces the loop reads (002 supplies the content).
- TTS per reply in the active agent's voice and the session language, plus a startup cache of fixed lines per agent and language (welcome, clarify, handover, search filler).
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
| POST | `/sessions/{id}/recap` | The email recap from the address the visitor typed (spec 006): `{events, cost_eur}`, the events being `profile.updated` then `recap.ready`; 409 `consent_needed`, 400 `invalid_email` |
| WS | `/ws/transcribe` | Query: `language` (the default when the text cannot tell) and an optional `session_id`, whose usage counts the audio. In: base64 PCM (16 kHz mono `pcm_s16le`) and `end`. Out: transcript deltas, then the final text with language and `stt_final_ms` |
| POST | `/conversation/stream` | In: `session_id`, `text`, `language`. Out: SSE events for one turn |
| POST | `/voice/speak` | In: `agent`, `language`, `text` (up to 2,000 characters), and an optional `session_id`, whose usage counts the characters. Out: streamed PCM (float32, 24 kHz, mono) in that agent's voice. Voice ids stay server-side |
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
| `text.done` | `agent`, `text`: a model call's whole text, sent as soon as the call ends, before its tools run and before the turn waits for its observers |
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

The browser records `speech_end` (last voiced frame, or the push-to-talk release), `stt_final`, `request_sent`, `first_delta`, `first_sentence` (the first reply text sent to speech, at `text.done`), `first_audio` (first sample played; filler and handover lines count and are flagged). Time to first audio is `first_audio - speech_end`. The page shows each turn's breakdown and posts it to `/turns/{turn_id}/timings`; structlog writes one line per turn with both sides. Logs hold timings and text only.

### Running cost

Each session carries a usage meter (`backend/app/usage/`). Prices are in euros by model id in `backend/app/usage/pricing.py`, with their source and date; realtime-3 transcription is not on the public price list, so it uses the listed realtime model's €0.0053 a minute (Thomas, 2026-10-05). The meter counts the chat tokens from the usage on each streamed call's last chunk and on the profile extractor's response; the speech-to-text seconds from the audio bytes the bridge forwards (32,000 a second), since the realtime `usage.prompt_audio_seconds` read 2 or 3 whatever the clip length; and the text-to-speech characters of every request started, hedges included, since each one is billed. Fixed lines are synthesised once at startup and cost no session anything. `turn.done` carries the total so far. Once a turn's audio has played, the browser reads `GET /sessions/{id}/usage` to add that turn's speech, and it keeps the highest total it has seen for the current session.

### Conversation loop

`backend/app/conversation/loop.py`, ported from the streaming loop in the reference `agents.py`, rewritten for `client.chat.stream_async`:
1. Messages: the active agent's instructions, the history, and a context block (reply language, profile, basket) as a system message just before the latest visitor message. Everything before that block stays byte for byte the same from turn to turn, so Mistral's prompt cache reuses it.
2. Call with the agent's tools and its `tool_choice` for this turn. The concierge forces `transfer_to_agent`.
3. Stream text deltas, then `text.done` once the call has ended. Accumulate tool-call fragments by index; when a call is complete, validate its arguments, run the handler, emit its events, append the result, and call the model again.
4. A tool result may name an agent to switch to, a fixed line to play, and whether the turn ends there. On a switch the loop sets `session.active_agent`, emits `agent.switched`, then runs the new agent's first reply inside the same turn. The transfer call and its result leave the history; the summary goes into the new agent's context block.
5. When a tool listed in the agent's `tool_fillers` starts before the agent has said anything in this turn, the loop emits `line.play` with that filler.
6. At most three tool rounds per agent per turn; the next call then runs with `tool_choice="none"`.
7. When a reply without a tool call promises an action ("let me find", "one moment", read by the agent's `promises_action`), the loop calls the model again at once with `tool_choice="any"`, so the agent acts in the same turn instead of waiting for the visitor (Thomas's live run, 2026-10-05). It does so once per turn.

The loop imports no catalogue, brand or prompt module. The realtime model sends no language event (STT spike), so a local detector restricted to English and French reads the final transcript, defaulting to the session language.

### Agent and tool interfaces

`AgentConfig`: id, display name, role label, model, instructions (English; the context block names the reply language each turn), tools, `tool_choice` policy, `tool_fillers`, voice per language, fixed lines per language, transfer targets, and a context block renderer. `Tool`: name, description, a Pydantic argument model, and a handler `(session, args) -> ToolResult`. `ToolResult` holds the content for the model, the events for the browser, and optionally an agent to switch to, a fixed line to play and an end of turn. Turn observers (the 002 profile extractor) start with each turn and their events go out before `turn.done`. 002 provides the configs, tools and observers.

### Speech output

The browser speaks each reply whole: on `text.done` it requests `/voice/speak` with that model call's text, and schedules the streamed PCM chunks back to back with Web Audio. Sentence by sentence, each request started its own intonation, which Thomas heard as robotic (2026-10-05); one request keeps one intonation. The first chunk takes as long for three sentences as for one (tts-3, 6 runs each: median 403 ms against 433 ms), so the cost is the time the model takes to finish the reply, about 0.2 to 0.5 s. Text that never got its `text.done` (a broken stream) is spoken at the end of the turn.

About one request in ten stalls before its first chunk, sometimes for 10 s, so two requests race from the start (`tts_parallel_start`), a third joins when neither has delivered audio after 0.9 s (`tts_hedge_after_s`, `tts_max_attempts` 3), and each gets 5 s for its first chunk (`tts_first_chunk_timeout_s`). The first to deliver audio wins and the others are cancelled; a request that fails is replaced after 200 ms while the others keep running, since 429 and 503 come in bursts. The silence a voice puts before its first word (about 255 ms on tts-3) is trimmed as the stream arrives, keeping 20 ms. The Mistral client keeps idle connections for 300 s (`backend/app/main.py`): the SDK's default dropped them after 5 s, so every turn opened new ones.

Startup synthesises the fixed lines without the racing start, which keeps its burst of requests small and opens the TTS connection. On `line.play` the browser plays the cached fixed line at once; the welcome line plays when a session starts. On `agent.switched` it leaves a 1.2 s pause after the handover line, so the new agent speaks after a breath; the turn's first sound, and so the reply time, is still the handover line. The backend decides every fixed line, so the browser holds no journey rules. The mic is muted while the agent speaks (no barge-in in V0).

### End of speech

In automatic mode, `frontend/src/lib/speech-gate.ts` reads the mic's 64 ms frames. Two voiced frames start the visitor's line, with the 320 ms of audio before them. After 450 ms of silence the browser ends the transcription socket, so the final text is ready when the line ends at 700 ms; two voiced frames in between resume the line on a new socket, and the turn gets the text of every socket in order. The line ends at 700 ms when its final text looks finished. When it looks unfinished, as when the visitor stops mid-sentence to find a word, the line waits up to 1.8 s of silence, and speech in that time resumes it (Thomas, 2026-10-06). Unfinished means the text ends without . ? or !, ends with an ellipsis, or ends with a filler or a connecting word such as "and", "the", "um", "et", "pour" or "euh" (`frontend/src/lib/hesitation.ts` holds the rule and the word list). In a probe with TTS voices, realtime STT wrote all 20 sentences cut mid-phrase in those ways ("I am looking for a", "My skin is...", "Je voudrais une crème pour.") and closed 45 of 49 whole answers with . ? or !. Six whole answers would wait 1.8 s: "Combination Skin" and "We" (a misheard "Oui"), twice each, without punctuation, and "Yes, I would love to." and "It is the one I was thinking of.", which end on a listed word. A pause after words that already make a sentence ("I am looking for something") still ends the line at 700 ms. The final text arrives about 10 ms after the 700 ms mark, so the engine decides the moment it arrives, and a finished line starts its turn as fast as before. Reply times still run from the last voiced frame. A line is cut at 20 s. A frame is voiced when its RMS is three times the room's noise, read from the quietest fifth of the last 3 s of frames, and at least 0.012 and at most 0.04: a noisy hall raises the threshold, so it cannot hold a line open, and a loud one cannot make the visitor unheard. The first half second after the welcome only measures the room. For 300 ms after the agent stops, nothing is heard, but the audio stays in the 320 ms kept before speech, so a quick "Yes" keeps its first word. When the transcription closes a sentence while the visitor is still speaking, a new socket carries the same line (Thomas, 2026-10-05).

### Frontend V0

`frontend/` from `create-next-app` (Next.js 16). Port `useVoiceAgent.ts` and `audio-utils.ts` from the reference with the Decathlon types replaced by `events.ts`. One page `/`: start and end session, mic mode (automatic, push-to-talk), a transcript labelled by speaker and agent where the visitor's words appear live as they speak, an event log with timings, profile and basket as JSON. No styling work; 003 keeps live transcription as a visible feature of the designed screens.

### Models

STT `voxtral-transcribe-realtime-3` (fallback `voxtral-mini-transcribe-realtime-2602`), agents `mistral-small-latest`, TTS `voxtral-mini-tts-3` streamed as PCM (`voxtral-mini-tts-2603` until 2026-10-05; `spikes/2026-10-04-tts/README.md`), all set in `backend/app/settings.py`. The spikes in `spikes/2026-10-04-realtime-stt/`, `-tts/` and `-chat-engine/` fix the final values, recorded here. Docstral reference: `mistralai` 3.0.0, Python, sections `realtime_audio`, `speech_generation`, `chat_streaming`, `tool_calling`, `structured_output`.

## Risks and fallbacks

- Realtime-3 misbehaves on the day: switch to `voxtral-mini-transcribe-realtime-2602` in settings.
- The chat API answers 503 in bursts (11 of 40 calls in one minute during the spike): the streamer retries once when nothing has streamed yet, then falls back to `mistral-medium-latest`.
- `context_bias` has no SDK parameter in 3.0.0: the bridge sends it as a raw `session.update`, which realtime-3 accepts (spike: "Lancôme Hydra Zen" right in 3 of 3 runs with it, misheard without). If that path breaks, brand names stay in the agents' instructions.
- Automatic end of speech waits 700 ms of silence (the reference waited 1.5 s, which the STT spike found was most of the delay), with the transcription ended at 450 ms so its final text does not add to the wait; a line whose text looks unfinished waits up to 1.8 s, which also slows a few whole answers (6 of 49 in the probe); push-to-talk has no wait.
- Room noise or speaker echo triggers the mic: push-to-talk.
- Slow office network: the timings show which stage; push-to-talk removes the silence wait.

## Verification

- Unit: event round trip, tool-call fragment accumulation, agent switch keeps history and changes tools and voice, three-round cap, the cost maths.
- Manual: the spoken golden-path run, with its timings table pasted into `tasks.md` as evidence.
- Live (`LIVE=1`): `frontend/tests/e2e/live-pause.spec.ts` plays "I'm looking for a", 1.5 s of silence and the rest through Chrome's fake microphone, and checks that the first turn carries the whole sentence.
- `scripts/verify` passes.

## Open questions

- The end-of-speech mode used on the day: 005 decides; V0 supports both.
- Whether each agent keeps one voice across languages: the TTS spike samples decide.
