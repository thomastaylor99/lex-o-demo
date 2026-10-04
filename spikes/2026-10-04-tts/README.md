# TTS spike: first audio, streamed chunks, voices, English into French

> Run 2026-10-04 from this folder against the live API with `mistralai` 3.0.0, which resolved without the exclude-newer override. SDK reference: Docstral `mistralai` 3.0.0 (`index`, `speech_generation`, `audio_transcription`) and the installed package's models.

## Question

Which text-to-speech settings give the fastest first audio, what do streamed chunks look like, which voices exist in English and French, and can one voice speak both English and French well enough for an agent that follows the visitor from English into French?

## Answer

- **Settings:** `voxtral-mini-tts-2603` with `response_format="pcm"` and `stream=True`. The first chunk arrives after a median 390 to 460 ms, the first audible sound after 450 to 550 ms. A non-streamed WAV of the same sentence takes a median 1.2 to 1.9 s. `voxtral-mini-tts-3` sends its first chunk as fast (385 to 415 ms) but opens 20-word sentences with about 250 ms of silence, so its first sound comes later; it finishes whole sentences 7 to 23% sooner, which streaming makes irrelevant. `voxtral-mini-tts-latest` is an alias of 2603.
- **Slow requests:** 7 of 70 streamed requests waited over 1 s for their first chunk, 3 of them 10 to 11 s (one on 2603, two on tts-3). The wait happens before the response headers arrive. The backend needs a timeout on the headers with a retry or a hedged second request, at least for the first sentence of each reply.
- **Chunks:** server-sent events. Each `speech.audio.delta` carries `audio_data`, a base64 string that decodes to float32 little-endian mono PCM at 24 kHz. Chunks 1 to 5 hold 400 ms each (38,400 bytes), later chunks 2 s (192,000 bytes). One `speech.audio.done` event with `usage` closes the stream. After the first chunk, audio arrived faster than real time in all 70 streams of the final pass.
- **Speed:** no speed parameter exists. The API rejects every unknown body field with 422 `extra_forbidden` on both models (`speed`, `rate`, `speaking_rate`, `speed_factor` and a nonsense control field). The SDK raises `TypeError` on `speed=`. Shorter replies remain the only lever.
- **Voices:** 39 presets and 7 custom clones in this workspace (`voices.md`). On 2603: Jane (en_gb, female, 9 styles), Oliver (en_gb, male, 7), Paul (en_us, male, 8), Marie (fr_fr, female, 6) and the clones. French has no male preset. Nine newer presets (Sarah, Yael, Linda, Marina, Fiona, Andrea, Esmeralda, Jesse, Eric) work only on `voxtral-mini-tts-3`. Two Decathlon voices are gone: `fr_marie_cheerful` and `en_adam_friendly` return 404. Filter with `client.audio.voices.search(language=["fr"])`; `en` also matches `en_gb` and `en_us`.
- **English into French:** the request has no language field. A voice reads whatever text it receives, so following the visitor into French means sending French text with the same `voice_id`. All six voices tested read both lines and Voxtral transcribed all 12 files back word for word. Accent and warmth need a listener: see the samples below.

## Run

From this folder, prefix each script with `uv run --with "mistralai==3.0.0" --with python-dotenv --with numpy python`:

| Script | Writes |
|---|---|
| `voices.py` | `voices.md`: every voice, filters, Decathlon voices, per-model compatibility |
| `latency.py` | `latency_results.json` (every run), `samples/latency__*.wav`, raw PCM in `/tmp/loreal-tts-spike/` |
| `speed.py` | prints the speed verdict |
| `crosslingual.py [model]` | `samples/<voice>__<lang>.wav`, prints transcripts; a model other than 2603 adds a suffix |

`common.py` holds the client (key read from the repo `.env`, never printed), the test texts and the WAV helpers.

## Timings

Python on Thomas's laptop, one warm client, requests in sequence, models and formats interleaved, five runs per cell. Milliseconds, median with min to max. First sound is the first chunk plus the leading silence under -40 dBFS. Voices: `gb_jane_confident` for English, `fr_marie_neutral` for French. The browser adds its own hop on top.

- `en_short`, 8 words: "Welcome! Tell me a little about your skin."
- `en_medium`, 20 words: "Thanks for sharing that. I would start with this gentle serum, then apply your usual moisturiser every morning and evening."
- `fr_medium`, 20 words: "Merci pour ces précisions. Je commencerais par ce sérum doux, puis votre crème hydratante habituelle, chaque matin et chaque soir."

| Model | Text | Audio (s) | WAV, stream=False: total | PCM, stream=True: first chunk | First sound | PCM, stream=True: total |
|---|---|---|---|---|---|---|
| 2603 | en_short | 3.8 | 1194 (832 to 1511) | 456 (362 to 562) | 534 | 956 |
| 2603 | en_medium | 8.3 | 1932 (1314 to 5447) | 393 (330 to 1519) | 452 | 1510 |
| 2603 | fr_medium | 7.5 | 1308 (1240 to 4742) | 438 (405 to 1982) | 551 | 1436 |
| tts-3 | en_short | 3.8 | 966 (757 to 3992) | 415 (387 to 496) | 493 | 787 |
| tts-3 | en_medium | 9.1 | 1501 (1344 to 5758) | 384 (379 to 412) | 620 | 1360 |
| tts-3 | fr_medium | 7.0 | 1212 (1183 to 1595) | 391 (386 to 818) | 661 | 1099 |

Twenty more streamed `en_medium` requests per model, to see the tail:

| Model | First chunk p50 | p90 | Max | Over 1 s | Headers p50 | Headers p90 | Leading silence p50 |
|---|---|---|---|---|---|---|---|
| 2603 | 463 | 1223 | 10948 | 3 of 20 | 277 | 1183 | 80 |
| tts-3 | 435 | 1797 | 10754 | 2 of 20 | 293 | 1671 | 255 |

- Slow first chunks over the whole final pass: 2603 had 1.1, 1.5, 2.0, 2.7 and 10.9 s out of 35; tts-3 had 10.3 and 10.8 s out of 35. In each case the headers came 20 to 180 ms before the first chunk, then chunks flowed at the usual pace.
- Non-streamed WAV stalls too: 5 of 30 took 3.1 to 5.8 s.
- First request on a fresh client: 0.9 s on tts-3 and 12 s on 2603 in the final pass, 1.3 s on 2603 in an earlier pass. Warm the connection at startup.
- The earlier pass (re-run after fixing a byte-rate error in the analysis; its raw data was overwritten) had one 2603 stream stop for 3.7 s after its fifth chunk, which leaves about 2 s of silence mid-sentence. None of the 70 streams in the final pass paused.
- Trimming leading samples under -40 dBFS would recover 60 to 110 ms on 2603 and 80 to 270 ms on tts-3.

Reference formats, one `en_medium` request each:

| Request | 2603 | tts-3 |
|---|---|---|
| mp3, stream=False: total | 1487 | 1549 |
| mp3, stream=True: first chunk | 1190 | 1248 |
| wav, stream=True: first chunk | 440 | 1379 (headers at 722: a slow request) |

- Streamed mp3 sends a 44-byte first chunk that starts with an ID3 tag, after headers at 816 and 899 ms, so decodable audio comes later still. The earlier pass measured 1.6 and 4.0 s. Leave mp3 out.
- Streamed wav works: the first chunk is a 44-byte RIFF header with both size fields at 0xFFFFFFFF, followed by 400 ms of int16 PCM at 24 kHz (19,244 bytes in total). The earlier pass gave 438 and 336 ms. It carries half the bytes of the float32 stream; the client skips the header once.

## Streamed event format

On the wire (`text/event-stream; charset=utf-8`), captured with a plain HTTP request:

```
event: speech.audio.delta
data: {"type":"speech.audio.delta","audio_data":"AAD4vAAA5LwAANG8...<51200 base64 chars>"}

event: speech.audio.delta
data: {"type":"speech.audio.delta","audio_data":"AAAnPAAAEzwAAAA8...<51200 base64 chars>"}

(more deltas)

event: speech.audio.done
data: {"type":"speech.audio.done","usage":{"prompt_audio_seconds":null,"prompt_tokens":250,"total_tokens":100090,"completion_tokens":99840,"request_count":null,"prompt_tokens_details":null,"completion_tokens_details":null,"service_tier":null,"prompt_token_details":null}}
```

In the SDK:

```python
stream = await client.audio.speech.complete_async(
    model="voxtral-mini-tts-2603", input=text, voice_id="gb_jane_confident",
    response_format="pcm", stream=True,
)
async with stream as events:  # EventStreamAsync[SpeechStreamEvents]
    async for event in events:
        if event.event == "speech.audio.delta":  # event.data: SpeechStreamAudioDelta
            samples = np.frombuffer(base64.b64decode(event.data.audio_data), dtype="<f4")
        elif event.event == "speech.audio.done":  # event.data: SpeechStreamDone
            usage = event.data.usage
```

- `SpeechStreamEvents` has `event` (str) and `data`. `SpeechStreamAudioDelta` has `type` and `audio_data` (base64 str). `SpeechStreamDone` has `type` and `usage` (`UsageInfoDollarDefs`). Unknown types parse into `UnknownSpeechV1AudioSpeechPostData`.
- No `[DONE]` sentinel: the stream closes after `speech.audio.done`.
- `usage.completion_tokens` equals the number of output samples (860,160 bytes, 215,040 samples). `prompt_tokens` ran 150 to 265 on 2603 and 22 to 44 on tts-3.
- Chunk sizes held in all 70 streams: five chunks of 38,400 bytes (400 ms), then 192,000 bytes (2 s), then a remainder in multiples of 3,840 bytes (40 ms). A 20-word sentence gives 8 or 9 chunks.
- Encoding evidence: the WAV of the same text declares 24,000 Hz, mono, 16-bit integer. The streamed bytes read as float32 are all finite with peaks of 0.59 and 0.64 (int16 read as float32 yields NaN), their duration at 4 bytes per sample (8.96 and 9.68 s) is close to the WAV of the same text (8.32 and 9.92 s, separate takes), and the decoded audio transcribes back word for word. `samples/latency__<model>__en_medium__from-pcm-stream.wav` is that decode.
- Not streamed: `SpeechResponse.audio_data` is the base64 of a complete file. The WAV has a 44-byte header and int16 mono samples at 24 kHz.

## Samples to listen to

`voxtral-mini-tts-2603`, `wav`, one take each.

- English: "Based on what you told me, this cream is my top pick for your dry, sensitive skin."
- French: "D'après ce que vous m'avez dit, cette crème est mon premier choix pour votre peau sèche et sensible."

Voxtral (`voxtral-mini-latest`, no language hint) transcribed all 12 files with a 0% word error rate. That covers intelligibility only.

| Voice | voice_id | Picked as | English | French |
|---|---|---|---|---|
| `gb_jane_confident` | `cbe96cf0-85ec-4a10-accb-0b35c93b6dfd` | female, en_gb, assured and poised: the credible adviser | `samples/gb_jane_confident__en.wav` (6.2 s) | `samples/gb_jane_confident__fr.wav` (5.8 s) |
| `gb_jane_curious` | `5de47977-6e47-4266-a938-3bc1d76b4676` | female, en_gb, inquisitive and open: the adviser who asks | `samples/gb_jane_curious__en.wav` (6.0 s) | `samples/gb_jane_curious__fr.wav` (8.8 s, slowest delivery) |
| `gb_oliver_cheerful` | `5ad5d44e-6b4e-4a57-a8a8-4cae088034ed` | male, en_gb, bright and lively: the welcoming concierge (Decathlon greeter) | `samples/gb_oliver_cheerful__en.wav` (5.8 s) | `samples/gb_oliver_cheerful__fr.wav` (6.9 s) |
| `en_paul_happy` | `1024d823-a11e-43ee-bf3d-d440dccc0577` | male, en_us, sunny and easygoing: the relaxed concierge | `samples/en_paul_happy__en.wav` (6.2 s) | `samples/en_paul_happy__fr.wav` (6.7 s) |
| `fr_marie_happy` | `49d024dd-981b-4462-bb17-74d381eb8fd7` | female, fr_fr, warm and radiant | `samples/fr_marie_happy__en.wav` (4.9 s) | `samples/fr_marie_happy__fr.wav` (5.2 s) |
| `fr_marie_neutral` | `5a271406-039d-46fe-835b-fbbb00eaf08d` | female, fr_fr, composed and steady | `samples/fr_marie_neutral__en.wav` (5.0 s) | `samples/fr_marie_neutral__fr.wav` (4.4 s) |

Same voice and text on both models: `samples/latency__voxtral-mini-tts-2603__en_medium.wav` against `samples/latency__voxtral-mini-tts-3__en_medium.wav` (Jane Confident), and the `fr_medium` pair (Marie Neutral).

## Other findings

- `mistralai` 3.0.0 installs `httpx2` (module `httpx2`). Plain `httpx` is absent unless the project adds it, and FastAPI's `TestClient` needs it.
- `voices.list` (GET /v1/audio/voices) is deprecated since 2026-09-07 and sunsets 2027-03-31. `voices.search` (GET /v2/audio/voices) replaces it and is the only one with filters.
- With a custom voice, "Hello." twice came back as 5 to 6 s of audio (Tommy UK on 2603, Mbappé on tts-3).
- `client.models.list()` also shows `voxtral-mini-tts-charente-2606-solutions` with the `audio_speech` capability. Not tested.
