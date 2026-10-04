# Realtime speech-to-text on mistralai 3.0.0

Run on 2026-10-04 against the live API with `mistralai[realtime]==3.0.0` (it resolved without the `exclude-newer` override) on Python 3.14. 154 timed realtime sessions in total.

## Question

On `mistralai` 3.0.0 (Python), which realtime speech-to-text model should the demo use, does `context_bias` work on realtime, what events arrive (especially language detection), how long from end of audio to the final transcript, and does a switch from English to French inside one session transcribe correctly?

## Answer

- **Model: `voxtral-transcribe-realtime-3`.** It got 39 of 45 key terms against 30 for the 2602 mini, with the steadiest finish (worst of 12 comparison runs 0.27 s, against 3.85 s and 0.78 s for the two mini IDs). The server reports it as `voxtral-transcribe-realtime-3-0-1`. `voxtral-mini-realtime-latest` is an alias of `voxtral-mini-transcribe-realtime-2602`, the same checkpoint (`client.models.list()` and `session.created` agree).
- **`target_streaming_delay_ms`: leave it unset.** The default gave the steadiest tail. 200 ms shows the first words 0.3 s sooner, but 3 of 12 runs finished late (0.39 to 0.66 s). 500 ms behaves like the default; pin 500 if a fixed value is wanted.
- **`context_bias` works on `voxtral-transcribe-realtime-3` through a raw `session.update` frame.** SDK 3.0.0 has no parameter for it: `connect(context_bias=...)` and `update_session(context_bias=...)` raise `TypeError`, and `RealtimeTranscriptionSessionUpdatePayload` drops the field silently. With the bias list, FR2 goes from "l'Encom Hydrazen" to "Lancôme Hydra Zen" in 3 of 3 runs, at no latency cost. `voxtral-mini-transcribe-realtime-2602` rejects it with an `error` frame and closes the socket.
- **Language event: none.** `transcription.language` (field `audio_language` in the SDK model) never arrived in 154 sessions on any model, and `transcription.done.language` was always `null`. The language has to come from the transcript text.
- **End of audio to final transcript: 0.20 s.** `transcription.done` arrives 0.20 s after the last audio chunk (median of 37 sessions, p90 0.22 s, one outlier at 0.75 s), about 0.35 s after the last word is spoken. Most of the text has already streamed by then.
- **Language switch works.** EN1, 1 s of silence, then FR1 in one session comes out right in both languages on every model (9 of 9 runs), with no language event and an empty `segments` list.
- **The old import still works.** `from mistralai.extra.realtime import RealtimeTranscription` and `RealtimeTranscription(client.sdk_configuration)` run unchanged on 3.0.0; `client.audio.realtime` is an instance of that class.

## Method

- Clips: TTS with `voxtral-mini-tts-2603`, voice `gb_jane_neutral` for English and `fr_marie_neutral` for French. The 24 kHz WAV is resampled to 16 kHz mono `pcm_s16le` with 0.3 s of silence prepended. Each clip ends 0.09 to 0.21 s after its last word. Audio stays in `/tmp/rtstt/clips`.
- Streaming: 100 ms chunks (3200 bytes) on a fixed real-time schedule, then `flush_audio()` and `end_audio()`. "After last chunk" is measured from the moment the last chunk is sent. One session at a time, three runs per case, medians reported.
- `harness.py` wraps the SDK's websocket to timestamp every raw frame on arrival, because the SDK models drop fields they do not declare.
- Accuracy: word error rate on folded text (case, accents and punctuation ignored, US "moisturizer" accepted), plus a check of the key terms in each sentence. Every case returned identical text in all three runs, so decoding looks deterministic and the sample is one TTS voice per language.

## Timings

Models at the default delay, `flush` then `end`. Seconds, medians of 3 runs.

| model | clip | done after last chunk | first delta after last chunk | last delta after last chunk | first delta after audio start | WER | key terms |
|---|---|---|---|---|---|---|---|
| `voxtral-transcribe-realtime-3` | EN1 (6.2 s) | 0.20 | 0.12 | 0.13 | 1.17 | 0.00 | 6/6 |
| `voxtral-transcribe-realtime-3` | EN2 (9.7 s) | 0.21 | 0.09 | 0.13 | 1.27 | 0.00 | 18/18 |
| `voxtral-transcribe-realtime-3` | FR1 (4.5 s) | 0.20 | 0.07 | 0.12 | 1.27 | 0.00 | 9/9 |
| `voxtral-transcribe-realtime-3` | FR2 (4.2 s) | 0.21 | 0.08 | 0.14 | 1.27 | 0.30 | 6/12 |
| `voxtral-mini-transcribe-realtime-2602` | EN1 | 0.23 | 0.16 | 0.17 | 1.37 | 0.00 | 6/6 |
| `voxtral-mini-transcribe-realtime-2602` | EN2 | 0.22 | 0.09 | 0.14 | 1.28 | 0.18 | 12/18 |
| `voxtral-mini-transcribe-realtime-2602` | FR1 | 0.24 | 0.07 | 0.17 | 1.27 | 0.00 | 9/9 |
| `voxtral-mini-transcribe-realtime-2602` | FR2 | 0.26 | 0.09 | 0.19 | 1.27 | 0.40 | 3/12 |
| `voxtral-mini-realtime-latest` | EN1 | 0.26 | 0.15 | 0.17 | 1.38 | 0.00 | 6/6 |
| `voxtral-mini-realtime-latest` | EN2 | 0.36 | 0.10 | 0.20 | 1.28 | 0.18 | 12/18 |
| `voxtral-mini-realtime-latest` | FR1 | 0.21 | 0.06 | 0.14 | 1.27 | 0.00 | 9/9 |
| `voxtral-mini-realtime-latest` | FR2 | 0.22 | 0.08 | 0.16 | 1.26 | 0.40 | 3/12 |

The first delta arrives about 1 s after speech starts (the column includes the 0.3 s lead-in), and 71 to 88% of the text is on screen before the audio ends. Connecting takes 0.25 s (median, max 0.39 s).

`target_streaming_delay_ms` on `voxtral-transcribe-realtime-3`, 12 sessions per setting:

| setting | done after last chunk, median (range) | last delta after last chunk | first delta after audio start | mean WER |
|---|---|---|---|---|
| unset | 0.20 (0.20 to 0.22) | 0.13 | 1.27 | 0.075 |
| 200 | 0.18 (0.17 to 0.66) | 0.10 | 0.97 | 0.075 |
| 500 | 0.21 (0.20 to 0.28) | 0.14 | 1.28 | 0.075 |

How the client ends the utterance, `voxtral-transcribe-realtime-3`, 12 sessions each (8 for turn detection):

| end signal | done after the end signal | last word after speech end | done after speech end |
|---|---|---|---|
| `flush` then `end` at the end of the clip | 0.20 | 0.28 | 0.36 |
| `end` only at the end of the clip | 0.20 | 0.26 | 0.34 |
| `end` only after 1.5 s of silence (the reference browser) | 0.20 | 0.80 | 1.84 |
| server `turn_detection` with defaults | `turn.eager_end` 0.61 and `turn.end` 1.47 after speech end | | |

## Events as received

Frames the SDK sends: `session.update` (`session` with `audio_format`, `target_streaming_delay_ms`), `input_audio.append` (`audio`, base64, at most 262144 decoded bytes), `input_audio.flush`, `input_audio.end`.

| incoming `type` | keys | when |
|---|---|---|
| `session.created` | `session` | handshake, consumed inside `connect()` and replayed on iteration |
| `session.updated` | `session` | after each `session.update` |
| `transcription.text.delta` | `text` | word pieces while audio streams |
| `transcription.done` | `model`, `text`, `language` (always `null`), `segments` (always `[]`), `usage` | about 0.2 s after `end` |
| `error` | `error` with `message` and `code` (3051) | invalid or unsupported `session.update`, then a 1011 close |
| `turn.start`, `turn.eager_end`, `turn.resume` | `time_s` | only with `turn_detection` |
| `turn.end` | `time_s`, `end_reason` (`"threshold"`) | only with `turn_detection` |

Never received: `transcription.language` and `transcription.segment`, though the SDK parses both.

The server's `session` object, as echoed in `session.updated`, holds `request_id`, `model`, `audio_format`, `target_streaming_delay_ms`, `diarize`, `context_bias`, `language`, `speaker_references` and `turn_detection`. SDK 3.0.0 declares the first four. The server forbids unknown keys and wants `context_bias` as a list.

## Accuracy notes

- EN2 without bias: `voxtral-transcribe-realtime-3` wrote every brand right ("La Roche-Posay Toleriane Double Repair", "CeraVe", "Kiehl's Ultra Facial Cream"). The mini wrote "Tolerian" and "Ultrafacial".
- FR2 is the hard sentence. Without bias, `voxtral-transcribe-realtime-3` wrote "Je préfère l'Encom Hydrazen ou alors Garnier Hyaluronic Aloe." and the mini "l'encombe hydrazène ... garnier hyaluronique aloe".
- With the requested bias list, FR2 became "Lancôme Hydra Zen" but "Hyaluronic" turned into "Hyaluronique". Adding "Hyaluronic Aloe" to the list fixed it: EN1, EN2 and FR2 all came out exact in 3 of 3 runs, with `done` still at 0.20 s.
- Keep multi-word names whole on realtime. A single-word list (dropping "La") produced "Le Roche-Posay" in 3 of 3 runs. The batch API behaves the other way: it rejects items with whitespace ("Context bias item 'La Roche-Posay' must not contain commas or whitespace").
- FR1 (Vichy Minéral 89) came out right on every model and run.
- The delay setting changed punctuation only: 200 ms gave "CeraVe Moisturizing Cream? Or Kiehl's", and 500 ms added commas between the brand names.
- Batch baseline (`batch_baseline.py`): `voxtral-transcribe-3` with single-word bias reached "Lancôme Hydra Zen" in 0.4 s per clip. A batch pass after the realtime one would add latency for no gain.
- These are clean TTS voices. Visitors with accents in a noisy room will do worse, so test with real voices before the event.

## Gotchas for porting the reference's `/ws/transcribe`

1. The reference code runs as is on 3.0.0. Switch `STT_MODEL` to `voxtral-transcribe-realtime-3`, and prefer `client.audio.realtime.connect(...)` to building `RealtimeTranscription(client.sdk_configuration)`; it is the same class.
2. `context_bias` needs one raw frame after `connect()` and before the first audio chunk:
   `await connection._websocket.send(json.dumps({"type": "session.update", "session": {"context_bias": BIAS}}))`.
   `_websocket` is private, so keep this in one function and re-check it on every SDK upgrade. `connection.session` will not show the bias, because the SDK model drops it; the raw `session.updated` frame echoes the list.
3. A bad `session.update` kills the session: an unknown key, a string where a list belongs, or a feature the model lacks (the mini rejects `context_bias`, `language` and `turn_detection`) each bring an `error` frame and a 1011 close.
4. The `transcription.language` branch never fires, so the browser's `language` message never comes. Take the language from the final text, or let the agent detect it.
5. The reference's `forward_events` ignores `error` events, so the browser only sees its socket close. Forward them.
6. Break on `transcription.done` and close. The server drops the TCP connection right after `done` without a close frame, and reading on raises `ConnectionClosedError` (seen on both models). Keep one realtime session per utterance, as the reference does.
7. `flush` is optional: `end` alone gives `done` in the same 0.20 s.
8. The latency to cut is the browser's wait: it sends `end` after about 1.5 s of silence (6 chunks of 4096 samples). The last word arrives about 0.8 s after speech ends, and `done` at 1.84 s. A shorter silence window cuts most of that, at the risk of cutting off visitors who pause mid-sentence.
9. Server turn detection exists, undocumented and outside SDK 3.0.0. `{"turn_detection": {}}` enables defaults (`start_threshold` 0.5, `eager_end_threshold` 0.5, `end_threshold` 0.33, `min_silence_ms` 500, `end_timeout_ms` 3000). With those defaults, `turn.end` came 1.47 s after speech end, close to the reference's client wait, and EN1 produced a phantom turn in pure silence twice. `turn.eager_end` came at 0.61 s but also fires on mid-sentence pauses. Worth its own spike if we want server-side end of speech.
10. `usage.prompt_audio_seconds` reads 2 or 3 whatever the clip length (4.2 to 9.7 s). Count audio from the bytes sent if the cost counter needs it.
11. The server default audio format is already `pcm_s16le` at 16 kHz; keep setting it explicitly. The reference's 8192-byte chunks sit well under the 262144-byte cap per append.
12. Opening the session takes about 0.25 s. Open it when the mic opens, as the reference does, so it stays off the critical path.

## Files

| file | what it does |
|---|---|
| `common.py` | Paths, clip texts and voices, bias lists, scoring (WER, key terms) |
| `make_clips.py` | TTS, resampling, writes PCM and WAV copies to `/tmp/rtstt/clips` |
| `harness.py` | One realtime session at real-time pace, raw frame tap, timings |
| `bench.py` | Experiments: `models`, `delay`, `bias`, `bias_extra`, `switch`, `endonly`, `turn`, `afterdone`, `once` |
| `bias_probe.py` | What the SDK accepts for `context_bias`, and the server's replies to raw frames |
| `batch_baseline.py` | Batch transcription of the same clips, with and without bias |
| `summarise.py` | Markdown tables from `/tmp/rtstt/results/*.jsonl` |

Rerun from this folder, with each script launched as:

```bash
uv run --with "mistralai[realtime]==3.0.0" --with numpy --with python-dotenv python make_clips.py
```

Then the same for `bias_probe.py`, `bench.py <experiment>`, `batch_baseline.py` and `summarise.py`. `make_clips.py` draws new TTS audio each time, so rerun the experiments after it. Results land in `/tmp/rtstt/results`, outside the repo.
