# Chat engine spike: our own loop over chat completions

> 2026-10-04. `mistralai` 3.0.0 (resolves under the Kandji uv policy with no override), Python 3.14, public API from the dev laptop. Docs read in Docstral: `mistralai` python 3.0.0, sections `chat_streaming`, `tool_calling`, `structured_output`.

## Question

With realistic prompts, how fast are time to first token and time to a complete tool call? Does forcing a named function work, and how fast? Does the model emit text and a tool call in one response? Which model is fastest for the agents among `mistral-small-latest`, `ministral-14b-latest` and `mistral-medium-latest`? How fast and accurate is structured profile extraction with `ministral-8b-latest` against `mistral-small-latest`?

## Answer

- **Agent model: `mistral-small-latest`** (it is `mistral-small-2603`). On the expert's 2,100-token turns: first token 298 ms median, 343 ms p90 (389 / 482 ms with a cold prompt cache); a complete `search_products` call 624 / 856 ms. `mistral-medium-latest` is slower: 679 ms first token (2.3 times small) and 894 ms tool call. `ministral-14b-latest` skipped the diagnosis on 10 of 10 question turns, calling `search_products` with an invented `sensitive: false`, and ignored the speak-first rule.
- **Text plus tool call in one response: yes, when the prompt asks for it.** With one prompt rule, small streamed "Let me find a few options for you." at 321 ms median and then the tool call at 572 ms, in 10 of 10 runs. Without the rule it never did (0 of 10).
- **Forced named function: works, about 0.45 s.** `{"type": "function", "function": {"name": "transfer_to_agent"}}`, `"any"` and `"required"` are all accepted. 300 calls, all called `transfer_to_agent`, "Hello!" went to `unclear` every time, French went to `skincare`. Small: 433 / 534 ms streamed, 479 / 723 ms non-streamed. A forced call never carries text.
- **Reasoning: keep the default.** `reasoning_effort` accepts only `"none"` and `"high"` on small, and the default behaves as `"none"`. `"high"` doubles tool-call time and made the model skip the diagnosis 5 of 5 times. `prompt_mode="reasoning"` is rejected on all three models.
- **Extractor: `mistral-small-latest`**, with every field required but nullable and a field guide in the system prompt: 97.7% field accuracy, 15 of 20 exchanges fully right, the "my sister has oily skin" trap passed 5 of 5, 649 / 947 ms. Its only slips: the advisor's "dry skin" copied into `concerns` (4 of 20) and one budget band. `ministral-8b-latest` was slower in every variant (median 0.85 to 1.08 s) and banded "no more than thirty euros" as low 5 of 5 times.
- **Agent switch inside one history: accepted.** A `transfer_to_agent` call and its tool result can stay in the history when the next agent's `tools` lack that function, or when there are no tools at all. A second system message is accepted at the top or mid-history.

Model time before the first speakable sentence: about 0.3 s per expert turn, plus about 0.45 s on the turn that goes through the concierge.

## Setup

- Expert system prompt: 1,050 tokens (persona, voice rules, claims rules, four-question diagnosis, when to call each tool). The four tool schemas add 900 tokens. Turns: 2,088 prompt tokens (question turn) and 2,151 (tool turn). Everything lives in `fixtures.py`.
- History: concierge welcome, the visitor's need, then one diagnostic exchange (question turn, should ask about sensitivity) or two plus "What would you recommend?" (tool turn, should call `search_products`).
- Calls run one at a time on a warm client, interleaved across models, with one discarded warm-up per configuration. Time zero is taken just before the request. p90 is nearest rank: the 9th of 10 values, the maximum of 5. Default sampling everywhere (small, 14b and 8b default to 0.3, medium to 1.0).
- "Cold" adds a random nonce at the start of the system prompt so the prefix cache cannot hit.

## Expert agent, streamed

Run 2 (`results/expert_summary_run2.json`), no errors.

| Model | Runs | Question turn, first token, median / p90 | Same, cold cache | Tool turn, call complete, median / p90 | Behaviour |
|---|---|---|---|---|---|
| `mistral-small-latest` | 10 | 298 / 343 ms | 389 / 482 ms | 624 / 856 ms | Asked a diagnostic question 20/20, called `search_products` with the right arguments 10/10 |
| `ministral-14b-latest` | 5 | no text, called `search_products` 5/5 (672 / 767 ms) | same 5/5 (841 / 2,780 ms) | 735 / 1,339 ms | Skipped the diagnosis every time |
| `mistral-medium-latest` | 5 | 679 / 955 ms | 679 / 786 ms | 894 / 1,067 ms | Asked 10/10, called `search_products` 5/5 |

Speak first, then call (prompt rule: "first write one short sentence for the visitor in the same reply, then call the tool"):

| Model | Text and call in one response | First text, median / p90 | Call complete, median / p90 |
|---|---|---|---|
| `mistral-small-latest` | 10/10, text first every time (0/10 without the rule) | 321 / 615 ms | 572 / 830 ms |
| `ministral-14b-latest` | 0/5 | none | 910 / 1,225 ms |
| `mistral-medium-latest` | 5/5 | 644 / 738 ms | 898 / 967 ms |

Small's question replies: 553 ms to the end of the stream, 28 words and 3 sentences (medians). The first sentence ("Thank you for sharing that.") completes 20 to 30 ms after the first token, so first token is effectively first sentence for TTS.

Run 1 of the same script, minutes earlier, hit a burst of `503 Service unavailable` (code 3800) on `mistral-small-latest`: 11 of its 40 calls failed in under a minute, and that run's tool-call p90 reached 2,250 ms (question-turn first token p90: 906 ms). Kept in `results/run1_503_burst/`.

## Concierge forced call

`mistral-small-latest`, 30 runs per row (10 for each line: English need, "Hello!", French need).

| `tool_choice` | Accepted | Called `transfer_to_agent` | Streamed, call complete, median / p90 | Non-streamed, median / p90 |
|---|---|---|---|---|
| `{"type": "function", "function": {"name": "transfer_to_agent"}}` | yes | 30/30 | 433 / 534 ms | 479 / 723 ms |
| `"any"` | yes | 30/30 | 456 / 562 ms | 501 / 584 ms |
| `"required"` | yes | 30/30 | 446 / 579 ms | 494 / 779 ms |
| `"auto"` (baseline) | yes | 30/30 | 460 / 580 ms | 486 / 549 ms |

- "Hello!" gave `agent="unclear"` in 80 of 80 small calls, and 10 of 10 on each other model. Both needs gave `skincare` every time. The summary comes back in English for the French line, as the prompt asks.
- One "Hello!" summary was embellished ("asked what they can do at the L'Oréal Beauty Studio").
- Named variant on the other models, 15 runs each: `ministral-14b-latest` 570 / 1,011 ms streamed and 576 / 2,218 ms non-streamed; `mistral-medium-latest` 385 / 457 ms streamed and 445 / 490 ms non-streamed. On this short prompt medium matches small; the long expert prompt is where small pulls ahead.

## Reasoning parameters

`mistral-small-latest`, expert turns, 5 runs per setting.

| Setting | Accepted | Question turn, first text, median / p90 | Tool turn, call complete, median / p90 |
|---|---|---|---|
| none sent | yes | 284 / 360 ms | 542 / 577 ms |
| `reasoning_effort="none"` | yes | 338 / 469 ms | 551 / 686 ms |
| `reasoning_effort="high"` | yes | no text: called `search_products` 5/5 after about 330 characters of thinking | 1,029 / 1,154 ms |
| `"minimal"`, `"low"`, `"medium"`, `"xhigh"` | 400, code 3051 | `reasoning_effort='low' is not supported for this model. Must be one of (none, high)` | |
| `prompt_mode="reasoning"` | 400, code 3051 | `Reasoning prompt mode is not enabled for this model` | |

`ministral-14b-latest` rejects any `reasoning_effort` (`reasoning_effort is not enabled for this model`). `mistral-medium-latest` accepts `"none"` and `"high"`, and rejects `prompt_mode` too.

## Profile extraction

`client.chat.parse_async(response_format=BeautyProfile, ...)`, one exchange per call (advisor line plus visitor reply), 4 exchanges times 5 runs = 20 calls per row. e1: skin and first name. e2: sensitivity, fragrance, texture. e3 (French): routine size, budget, hair. e4: a trap with no profile information ("My sister has really oily skin with lots of breakouts"). Expected values are in `bench_extractor.py`.

| Model | Schema | Median / p90 | Field accuracy | Fully right | Main errors |
|---|---|---|---|---|---|
| `ministral-8b-latest` | optional (Pydantic default) | 847 / 1,724 ms | 95.0% | 10/20 | `language` skipped in e1 5/5; thirty euros banded low 5/5 |
| `ministral-8b-latest` | required, nullable | 1,076 / 1,631 ms | 93.6% | 6/20 | thirty euros low 5/5; `language` null on e4 5/5; `skin_type` null on e1 4/5 |
| `ministral-8b-latest` | required + field guide | 1,005 / 1,519 ms | 96.8% | 13/20 | thirty euros low 5/5 |
| `mistral-small-latest` | optional | 514 / 760 ms | 79.1% | 1/20 | skipped six fields every time; the sister's skin became `concerns: [oiliness, blemishes]` 4/5 |
| `mistral-small-latest` | required, nullable | 666 / 755 ms | 96.8% | 13/20 | `skin_type` null for "tight, flaky" 4/5; invented `sensitive: true` once |
| `mistral-small-latest` | required + field guide | 649 / 947 ms | 97.7% | 15/20 | copied the advisor's "dry skin" into e2 `concerns` 4/5; thirty euros low 1/5 |

Hallucinations: with the optional schema, small turned the sister's skin into the visitor's `concerns` 4/5 and added an unstated "redness" to e1 3/5. With required fields, the sister trap passed 20/20 across both models; what remains is one invented `sensitive: true` (small, no guide) and extra list items: small copying the advisor's "dry skin" into e2 `concerns` (4/5 with the guide), 8b adding "dullness" to e1 once. Results: `results/extractor_summary.json`, earlier runs alongside.

## Agent switch in one history

Coordinator's check, `mistral-small-latest` streamed. History: expert system prompt, concierge welcome, visitor need, assistant `transfer_to_agent` call, its tool result. Results: `results/agent_switch.json`.

| Case | Result |
|---|---|
| `tools` = the four expert tools, `transfer_to_agent` absent | accepted 3/3; the expert asked its first diagnostic question and called nothing |
| No `tools`, no `tool_choice` | accepted 3/3, same behaviour |
| Concierge prompt first, expert prompt as a second system message after the tool result (last message is `system`) | accepted 3/3 |
| Two system messages at the top | accepted 3/3 |
| Assistant `content` as `""`, `None` or omitted | accepted |
| Tool message without `name` | accepted |
| `arguments` sent as a dict | accepted |
| `tool_call_id` `"call_abc123"` (outside Mistral's 9-character format) | accepted |
| Tool result followed by a user message | accepted |
| `tool_call_id` matching no call | 400 code 3230: `Unexpected tool call id Wr0ngId99 in tool results` |
| Tool message without `tool_call_id` | 400: `Unexpected tool call id None in tool results` |
| Assistant tool call as the last message | 400: `Expected last role User or Tool (or Assistant with prefix True) for serving but got assistant` |
| Tool call with no result, then a user message | 400: `Not the same number of function calls and responses` |

Shapes that work:

```python
{"role": "assistant", "content": "", "tool_calls": [{"id": "Tr4nsf3r1", "type": "function",
  "function": {"name": "transfer_to_agent", "arguments": "{\"agent\": \"skincare\", \"summary\": \"...\"}"}}]}
{"role": "tool", "tool_call_id": "Tr4nsf3r1", "name": "transfer_to_agent", "content": "{\"status\": \"transferred\", \"agent\": \"skincare\"}"}
```

## Stream format for tool calls

Raw chunks from `mistral-small-latest` on the tool turn with the speak-first rule (`results/probe_mistral-small-latest_tool_preamble.json`):

```
357 ms  choices[0].delta = {"role": "assistant", "content": ""}
358 ms  choices[0].delta = {"content": "Let"}
366 ms  choices[0].delta = {"content": " me find a few"}
378 ms  choices[0].delta = {"content": " options for you."}
593 ms  choices[0].delta = {"tool_calls": [{"id": "FDWwUlD7d", "type": "function", "index": 0,
            "function": {"name": "search_products", "arguments": "{\"category\": \"moisturiser\", \"skin_type\": \"dry\", ...}"}}]}
        choices[0].finish_reason = "tool_calls", and usage, in the same chunk
```

- Paths: `event.data.choices[0].delta.tool_calls[i]` is a `ToolCall` with `.id`, `.type`, `.index`, `.function.name` and `.function.arguments`. `arguments` was always a `str` holding the complete JSON.
- Every streamed call arrived as one fragment: 251 calls counted across the three models. Two parallel calls arrive together in one chunk, `index` 0 and 1 (`results/probe_parallel_tool_calls.json`).
- Without text, the role chunk arrives 1 to 2 ms before the call, and the HTTP headers themselves wait for the first token. Nothing signals a call before it is complete.
- `event.data.usage` arrives on the last chunk, with `prompt_tokens_details.cached_tokens` as an extra field.
- With `reasoning_effort="high"`, `delta.content` becomes a list: `[{"type": "thinking", "thinking": [{"type": "text", "text": "..."}]}]`. The switch to speech is one chunk holding an empty thinking part and `{"type": "text", "text": "That sounds"}`; plain strings follow.
- `event.data.model` (and `response.model` non-streamed) echoes the requested alias. `client.models.retrieve_async` shows `mistral-small-latest` is an alias of `mistral-small-2603`, `mistral-medium-latest` of `mistral-medium-2604`, the ministrals of `-2512`.

## Gotchas for the loop

1. Accumulate tool calls by `index` as the SDK docs say, and execute on `finish_reason == "tool_calls"`. Today each call arrives whole, so "arguments complete" equals "stream done".
2. Guard `delta.content`: a `str` normally, a list of typed chunks when reasoning is on. Never speak `thinking` parts.
3. For speech during a tool call, keep the speak-first rule: send the sentence to TTS on arrival, run the tool when the call lands, then call the model again with the result.
4. Every assistant tool call needs a `role: "tool"` message with the same `tool_call_id`, written before the next model call; anything else is a 400 (code 3230). An id outside the API's own format (`call_abc123`) was accepted, but keeping the ids it returns is simplest.
5. Agent switch: swap the first system message for the new agent's prompt and keep the transfer call and result in history. The new agent's `tools` can omit `transfer_to_agent`.
6. The concierge's forced call sits on the critical path of the first turn (about 0.45 s). Starting the expert stream in parallel and dropping it when the concierge says `unclear` would hide most of it.
7. Prefix caching is automatic. Small hit it on every warm run (2,064 of 2,088 prompt tokens cached), which saves about 90 ms of first token. 14b hit on 11 of 15 warm runs, in 1,024-token blocks; medium on 1 of 20. Keep the system prompt and tool list byte-stable and the history append-only.
8. Expect 503 bursts. The SDK retries nothing unless `retry_config` is set; add a short first-token timeout, one quick retry, then a fallback model.
9. `reasoning_effort` is rejected by models without reasoning (400 on 14b), so tie that parameter to the model in config. Default temperatures also differ (medium 1.0); set temperature explicitly.
10. `chat.parse_async` sends a strict schema, but Pydantic fields with defaults are left out of `required`. Models then skip keys and never come back to them. Declare every field required and nullable (`x: T | None = Field(description=...)`).
11. The JSON schema adds no prompt tokens (152 with or without it on both models): the model never sees `Field` descriptions. Put the meaning of each field and band in the system prompt. Better still, extract a number such as `max_price_eur` and derive bands in code.
12. `ministral-14b-latest` does not follow conversational rules in this prompt (diagnosis first, speak first). Keep it out of the agent seat.

## Files

Run any script from this folder with `uv run --with "mistralai==3.0.0" --with python-dotenv --with pydantic python <script>.py`.

| File | What it does |
|---|---|
| `fixtures.py` | Expert and concierge prompts, the five tool schemas, the history |
| `common.py` | Client from the repo `.env`, stream recorder with per-stage timings, retry on 429/5xx, stats |
| `models_check.py` | Model cards: aliases, capabilities, default temperature |
| `probe.py` | Dumps the raw chunks of one call (`python probe.py <model> <turn> [extra-json]`, or `tokens`) |
| `probe_parallel.py` | Raw chunks for a response with two tool calls |
| `bench_expert.py` | Steps 2 and 3 |
| `bench_concierge.py` | Step 4 |
| `bench_reasoning.py` | Step 5 |
| `bench_extractor.py` | Step 6 |
| `check_agent_switch.py` | Agent switch and message shapes |
| `results/` | JSON per run, logs, raw chunks |
