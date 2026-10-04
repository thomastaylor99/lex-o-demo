# Voices available to the demo API key

> Source: `voices.py`, run 2026-10-04 with `mistralai` 3.0.0 against the live API.

- `client.audio.voices.list(type_="all")` (GET /v1/audio/voices, offset pagination): 46 voices, `total` = 46; 39 preset, 7 custom.
- `client.audio.voices.search(type_="all")` (GET /v2/audio/voices, token pagination): 46 voices. Same ids as v1: True.
- The SDK marks v1 `list` deprecated on 2026-09-07 with sunset 2027-03-31; its replacement is v2 `search`.

## Filtering

Only v2 `search` filters. It takes `language` (list of codes), `gender` (list of `female`, `male`, `neutral`), `query` (free text) and `type_` (`all`, `preset`, `custom`).

```python
res = client.audio.voices.search(type_="preset", language=["fr"], gender=["female"], page_size=50)
voices = res.result.data  # next page: res.result.next_page_token, or res.next()
```

`language` matches by prefix: `en` also returns `en_gb` and `en_us` voices. Voices with an empty `languages` field never match a language filter.

| `language=[...]` | voices returned by search | `languages` equal to it | `languages` equal to it or starting with it plus `_` |
|---|---|---|---|
| `en` | 30 | 6 | 30 |
| `en_gb` | 16 | 16 | 16 |
| `en_us` | 8 | 8 | 8 |
| `fr` | 9 | 3 | 9 |
| `fr_fr` | 6 | 6 | 6 |

| `gender=[...]` | voices returned |
|---|---|
| `female` | 22 |
| `male` | 20 |
| `neutral` | 4 |

`search(type_="preset", language=["fr"], gender=["female"])` returns 6: fr_marie_angry, fr_marie_curious, fr_marie_excited, fr_marie_happy, fr_marie_neutral, fr_marie_sad.
`search(query="marie")` returns 6: fr_marie_angry, fr_marie_curious, fr_marie_excited, fr_marie_happy, fr_marie_neutral, fr_marie_sad.

## Decathlon reference voices

From `AGENT_VOICES` in `decathlon-reference/agents.py` (and its fallback `en_paul_excited`). "Synth" columns: a one-word `wav` request with that `voice_id`.

| Agent | Lang | voice_id | Listed | `voices.get` | Synth voxtral-mini-tts-2603 | Synth voxtral-mini-tts-3 |
|---|---|---|---|---|---|---|
| greeter | en | gb_oliver_cheerful | yes (preset, Oliver - Cheerful) | ok (preset, Oliver - Cheerful) | ok (0.6 s) | ok (0.9 s) |
| greeter | fr | fr_marie_cheerful | no | error 404 | error 404: Voice 'fr_marie_cheerful' not found. | error 404: Voice 'fr_marie_cheerful' not found. |
| hiking | en | 9c6b33b5-7fbe-48dc-b290-c89c408dc1f1 | yes (custom, Tommy UK) | ok (custom, Tommy UK) | ok (2.2 s) | ok (0.6 s) |
| hiking | fr | ddd8dc78-585c-4e38-abf7-8da555b445be | yes (custom, Nico FR) | ok (custom, Nico FR) | ok (3.0 s) | ok (2.1 s) |
| running | en | 2b082607-f170-41a4-9fc1-162b78a5e9b5 | yes (custom, Natasha US) | ok (custom, Natasha US) | ok (1.4 s) | ok (0.4 s) |
| running | fr | fr_marie_cheerful | no | error 404 | error 404: Voice 'fr_marie_cheerful' not found. | error 404: Voice 'fr_marie_cheerful' not found. |
| cycling | en | en_adam_friendly | no | error 404 | error 404: Voice 'en_adam_friendly' not found. | error 404: Voice 'en_adam_friendly' not found. |
| cycling | fr | 245c2c82-2600-495b-bbaf-5f19b986e4c7 | yes (custom, Mbappé) | ok (custom, Mbappé) | ok (0.7 s) | ok (6.2 s) |
| help | en | cbe96cf0-85ec-4a10-accb-0b35c93b6dfd | yes (preset, Jane - Confident) | ok (preset, Jane - Confident) | ok (0.6 s) | ok (1.1 s) |
| help | fr | fr_marie_neutral | yes (preset, Marie - Neutral) | ok (preset, Marie - Neutral) | ok (0.6 s) | ok (0.9 s) |
| fallback | - | en_paul_excited | yes (preset, Paul - Excited) | ok (preset, Paul - Excited) | ok (0.7 s) | ok (1.0 s) |

## All voices

The last two columns: does a one-word request with this voice work on that model. Failures on 2603 return 400 "voice is not supported for speech v1". Pass the slug (or the id for custom voices) as `voice_id`.

| slug | name | type | languages | gender | age | tags | description | id | voxtral-mini-tts-2603 | voxtral-mini-tts-3 |
|---|---|---|---|---|---|---|---|---|---|---|
|  | Natasha DK | custom | en | neutral |  |  |  | `5abaab91-de72-480e-96c3-0900e05e0748` | yes | yes |
|  | Natasha US | custom | en | neutral |  |  |  | `2b082607-f170-41a4-9fc1-162b78a5e9b5` | yes | yes |
|  | Thomas FR | custom | en | neutral |  |  |  | `12021d14-78dc-4b72-b24f-3c02c0cc90fb` | yes | yes |
|  | Tommy UK | custom | en | neutral |  |  |  | `9c6b33b5-7fbe-48dc-b290-c89c408dc1f1` | yes | yes |
|  | Macron | custom | fr | male |  |  |  | `70e4723b-daac-4370-ba65-47d1734a9541` | yes | yes |
|  | Mbappé | custom | fr | male |  |  |  | `245c2c82-2600-495b-bbaf-5f19b986e4c7` | yes | yes |
|  | Nico FR | custom | fr | male |  |  |  | `ddd8dc78-585c-4e38-abf7-8da555b445be` | yes | yes |
| voice_479 | Linda | preset |  | female |  |  |  | `01a0f318-4acd-72ec-8ea3-20176aeedd4b` | no | yes |
| voice_480 | Marina | preset |  | female |  |  |  | `01a0f318-4add-723d-8365-38fbfe6863a2` | no | yes |
| voice_481 | Fiona | preset |  | female |  |  |  | `01a0f318-4ae8-7446-a3e4-45aa092940b2` | no | yes |
| voice_482 | Andrea | preset |  | female |  |  |  | `01a0f318-4af2-7338-83be-2bdf790ea23f` | no | yes |
| voice_483 | Esmeralda | preset |  | female |  |  |  | `01a0f318-4afd-77a5-aa5e-f4d741c30187` | no | yes |
| voice_484 | Jesse | preset |  | male |  |  |  | `01a0f318-4b07-77cb-aca0-f375e3885ed7` | no | yes |
| voice_485 | Eric | preset |  | male |  |  |  | `01a0f318-4b11-7518-8ce9-69abeaf63255` | no | yes |
| voice_447 | Yael | preset | en | female |  |  |  | `01a0f6db-3084-701a-b61c-b6b755947e7f` | no | yes |
| voice_478 | Sarah | preset | en | female |  |  |  | `01a0f6db-3095-7682-b70f-6a15ebfba70a` | no | yes |
| gb_jane_confident | Jane - Confident | preset | en_gb | female | 30 | assured, poised, confident |  | `cbe96cf0-85ec-4a10-accb-0b35c93b6dfd` | yes | yes |
| gb_jane_confused | Jane - Confused | preset | en_gb | female | 30 | hesitant, uncertain, confused |  | `7d0a90a3-c211-4489-aaa0-61269299edc7` | yes | yes |
| gb_jane_curious | Jane - Curious | preset | en_gb | female | 30 | inquisitive, open, curious |  | `5de47977-6e47-4266-a938-3bc1d76b4676` | yes | yes |
| gb_jane_frustrated | Jane - Frustrated | preset | en_gb | female | 30 | tense, clipped, frustrated |  | `60844938-221d-4d1e-8233-34203f787d9f` | yes | yes |
| gb_jane_jealousy | Jane - Jealousy | preset | en_gb | female | 30 | bitter, strained, jealous |  | `e7168caa-f7ed-4e1c-98a1-434251f4f2b0` | yes | yes |
| gb_jane_neutral | Jane - Neutral | preset | en_gb | female | 30 | clear, measured, neutral |  | `82c99ee6-f932-423f-a4a3-d403c8914b8d` | yes | yes |
| gb_jane_sad | Jane - Sad | preset | en_gb | female | 30 | soft, subdued, sad |  | `c7a8eb83-5247-4540-89f3-6650d349100d` | yes | yes |
| gb_jane_sarcasm | Jane - Sarcasm | preset | en_gb | female | 30 | dry, wry, sarcastic |  | `a3e41ea8-020b-44c0-8d8b-f6cc03524e31` | yes | yes |
| gb_jane_shameful | Jane - Shameful | preset | en_gb | female | 30 | quiet, remorseful, ashamed |  | `230ccacf-8800-4aa0-8ac2-8d004f1d9fb7` | yes | yes |
| gb_oliver_angry | Oliver - Angry | preset | en_gb | male | 30 | intense, forceful, angry |  | `862274a7-8333-48f7-b668-f19c932999e0` | yes | yes |
| gb_oliver_cheerful | Oliver - Cheerful | preset | en_gb | male | 30 | bright, lively, cheerful |  | `5ad5d44e-6b4e-4a57-a8a8-4cae088034ed` | yes | yes |
| gb_oliver_confident | Oliver - Confident | preset | en_gb | male | 30 | firm, decisive, confident |  | `8169ab87-bc99-4669-a5ec-6855860ace24` | yes | yes |
| gb_oliver_curious | Oliver - Curious | preset | en_gb | male | 30 | thoughtful, engaged, curious |  | `390c8a2b-60a6-4882-8437-c49a8bd33b63` | yes | yes |
| gb_oliver_excited | Oliver - Excited | preset | en_gb | male | 30 | energetic, crisp, excited |  | `e8e5b1de-493c-4061-8414-e2170f9f4b6f` | yes | yes |
| gb_oliver_neutral | Oliver - Neutral | preset | en_gb | male | 30 | calm, even, neutral |  | `e3596645-b1af-469e-b857-f18ddedc7652` | yes | yes |
| gb_oliver_sad | Oliver - Sad | preset | en_gb | male | 30 | low, hollow, sad |  | `d4101b8f-12c3-450d-a812-7d700b3a3245` | yes | yes |
| en_paul_angry | Paul - Angry | preset | en_us | male | 30 | raw, gruff, angry |  | `cb891218-482c-4392-9878-91e8d999d57a` | yes | yes |
| en_paul_cheerful | Paul - Cheerful | preset | en_us | male | 30 | upbeat, breezy, cheerful |  | `01d985cd-5e0c-4457-bfd8-80ba31a5bc03` | yes | yes |
| en_paul_confident | Paul - Confident | preset | en_us | male | 30 | bold, punchy, confident |  | `98559b22-62b5-4a64-a7cd-fc78ca41faa8` | yes | yes |
| en_paul_excited | Paul - Excited | preset | en_us | male | 30 | bouncy, spirited, excited |  | `5940190b-f58a-4c3e-8264-a40d63fd6883` | yes | yes |
| en_paul_frustrated | Paul - Frustrated | preset | en_us | male | 30 | edgy, snappy, frustrated |  | `1f017bcb-02e5-460d-989b-db065c0c6122` | yes | yes |
| en_paul_happy | Paul - Happy | preset | en_us | male | 30 | sunny, easygoing, happy |  | `1024d823-a11e-43ee-bf3d-d440dccc0577` | yes | yes |
| en_paul_neutral | Paul - Neutral | preset | en_us | male | 30 | relaxed, balanced, neutral |  | `c69964a6-ab8b-4f8a-9465-ec0925096ec8` | yes | yes |
| en_paul_sad | Paul - Sad | preset | en_us | male | 30 | heavy, hushed, sad |  | `530e2e20-58e2-45d8-b0a5-4594f4915944` | yes | yes |
| fr_marie_angry | Marie - Angry | preset | fr_fr | female | 30 | fierce, sharp, angry |  | `a7c07cdc-1c35-4d87-a938-c610a654f600` | yes | yes |
| fr_marie_curious | Marie - Curious | preset | fr_fr | female | 30 | bright, probing, curious |  | `e0580ce5-e63c-4cbe-88c8-a983b80c5f1f` | yes | yes |
| fr_marie_excited | Marie - Excited | preset | fr_fr | female | 30 | vibrant, bubbly, excited |  | `2f62b1af-aea3-4079-9d10-7ca665ee7243` | yes | yes |
| fr_marie_happy | Marie - Happy | preset | fr_fr | female | 30 | warm, radiant, happy |  | `49d024dd-981b-4462-bb17-74d381eb8fd7` | yes | yes |
| fr_marie_neutral | Marie - Neutral | preset | fr_fr | female | 30 | composed, steady, neutral |  | `5a271406-039d-46fe-835b-fbbb00eaf08d` | yes | yes |
| fr_marie_sad | Marie - Sad | preset | fr_fr | female | 30 | muted, heavy, sad |  | `4adeb2c6-25a3-44bc-8100-5234dfc1193b` | yes | yes |
