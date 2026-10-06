# 006 Journey: personal reasons, tutorials, email recap

> Status: approved 2026-10-05 (decisions by Thomas); revised the same day after his live run: the visitor types the email on screen (branch `fix/recap-email`). Owner: Thomas. Branch `feat/journey`.

## Goal

Make the discovery feel personal and show L'Oréal leadership what the conversation is worth after the stand: each product says why it suits this visitor, the visitor leaves with tutorials to follow, and their email brings a recap with an in-store offer.

## Decisions

| Topic | Choice |
|---|---|
| Why it suits you | One sentence per product card, built in code from catalogue facts that match the profile (skin type, sensitivity, texture, fragrance-free, SPF, budget), English and French. The brand's approved claim stays on the card as the benefit |
| Tutorials | A bank of real TikTok and YouTube videos (Instagram when found), from the official brand accounts and from creators, a few per product, each link checked; Thomas approves the list (`tutorials.md`). Offered once the routine is complete, just before the hair bridge (spec 002, Cross-sell); cards show platform, creator, title and a QR code |
| Customer record | Adds the email only. After consent, the visitor types it in a field on screen; the expert never asks for it aloud (revised after the live run: a dictated address came in two pieces, and the expert refused it) |
| Recap | A model writes a short recap of the discovery from session facts and approved claims only, with an example in-store coupon (code and QR). Shown on screen as an email preview; nothing is sent |
| Privacy | The email is masked on screen and in events (c***@gmail.com) and redacted from logs. Nothing is stored after the session |
| Branch | All of it on `feat/journey`, merged through a pull request |

## Contracts (set before the agents start)

- `ProductView.fit`: string or null (`backend/app/tools/views.py`, `frontend/src/lib/events.ts`), from `fit_sentence(product, profile, language)` in `backend/app/catalogue/fit.py`.
- `BeautyProfile.email`: the masked address, set only by `POST /sessions/{id}/recap`.
- Event `tutorials.shown`: `tutorials`, each `{id, product_ids, brand, platform, creator, creator_kind, title, url, language}`.
- Event `recap.ready`: `email_masked`, `subject`, `body`, `coupon {code, label, valid_until}`.
- Tool `show_tutorials(product_ids)` (`backend/app/tools/tutorials.py`): stores what it showed in `session.flags["shown_tutorials"]` (the views) for the recap.
- Route `POST /sessions/{id}/recap` with `{email}` (`backend/app/api/sessions.py`, `backend/app/recap/service.py`): needs consent given (409 `consent_needed`), validates the typed address (400 `invalid_email`), masks it, writes the recap under the session lock, and returns `{events, cost_eur}`, the events being `profile.updated` then `recap.ready`, as a turn streams them. The engine applies them through its event handler (`submitEmail` in `frontend/src/lib/voice-engine.ts`).
- Screen: the email field (`frontend/src/skins/frost/EmailField.tsx`) shows while consent is given and no recap is on screen, takes the focus, and checks the address before sending (`frontend/src/lib/email.ts`). The browser plays `filler_recap` when the recap takes more than 0.8 s, then `recap_ready`, or `recap_failed` when the backend fails ("Sorry, I couldn't prepare your recap just now. Could you try again?"), the address staying in the field for a retry.
- The field closes with "No thanks" or Escape. The browser neither stores nor suggests what was typed (`autocomplete="off"`, a plain text input), so the next visitor never sees the address. Spaces are dropped as they are typed, and Space keeps driving hold-to-talk while the field has the focus (`data-voice-keys` on the input, read by the talk bar).
- Data: `backend/app/catalogue/data/tutorials.json`, `{"tutorials": [{id, product_ids, brand, platform, creator, creator_kind, title, url, language, verified_on}]}`.
- Screen state: `tutorialGroups`, `recap`, and transcript entries of kind `tutorials` and `recap` (`frontend/src/lib/voice-agent.ts`).
- Journey steps 5, 7 and 8 in the expert's prompt (`backend/app/agents/prompts.py`): tutorials, saving the profile, the typed email. Step 6, between them, is the hair bridge (spec 002, Cross-sell, 2026-10-06).

## Verification

- Unit tests: fit sentences in both languages, the tutorials tool, email normalising and masking, the coupon, log redaction, the recap service with a fake writer, the recap route, the expert's email and recap notes, the typed-address check.
- Golden path extended: `show_tutorials` called, the expert points at the email field after consent, the typed address brings `recap.ready`, every recap sentence is checked by the claims judge, and "I'm an AI" appears only in the introduction. A second golden conversation says the address aloud: the expert asks to type it, without repeating it.
- Browser test of the scripted conversation: the "For you" line, the tutorial cards, the hair moment (the record's hair row, the two Elvive products, the oil in the basket), the email field (a typo caught, then the address), the recap and its coupon.
- Thomas runs the journey live and approves the tutorial list.

## As built (2026-10-05)

- **Why it suits you:** a compact pattern under 100 characters, "For dry, sensitive skin: the rich texture you like, fragrance-free, within your budget." Skin concerns stay out (any wording reads as a benefit); the budget reads "within your budget"; search results use the search's own criteria, which reach the tool before the extractor updates the profile.
- **Tutorial cards:** each card is a link that opens its video in a new tab, with a "Watch" pill beside the QR code, so the presenter can play it on the computer while the conversation keeps running (Thomas, after the first live run).
- **Tutorials:** 18 videos, each checked through the platform's oEmbed (`tutorials.md`, awaiting Thomas's approval). At most four per call, one per product before any second, the session language first. Titles on screen and in the recap lose hashtags, emoji and capitals used for shouting, and keep brand spelling (`backend/app/catalogue/titles.py`). A note in the turn context asks for `show_tutorials` once two or more products are in the basket, because the prompt step alone was skipped.
- **Email:** typed on screen (revised after Thomas's live run on 2026-10-05, where speech to text cut the dictated address at a pause and the expert answered "I'm an AI, so I can't process email addresses"). After consent the expert says in one sentence that the visitor can type their email in the field on the screen; it never asks for an address aloud, repeats or spells one. When the visitor starts saying one anyway, a context note asks the expert to point at the field. The address is masked in the profile, in events and in logs, written or spoken.
- **Recap:** written by the model with structured output, then checked: quotations must be exact approved claims, fit sentences unchanged, the body ends with the code and stays under 140 words. Otherwise, or after 6 s, a template writes it. The browser says "One moment, I'm preparing your recap." when writing takes more than 0.8 s, then "Thank you. Your recap and your in-store offer are on screen." Once it is on screen, a context note keeps the expert from offering it again.
- **Coupon:** "LEX-" and four characters derived from the session id, an example 10% in-store offer valid 30 days.
- **Hair bridge (2026-10-06):** the turn the tutorials show now ends on one question about the visitor's hair instead of the save-profile question; the answer brings the two Elvive products, and the oil joins the basket before the save (spec 002, Cross-sell). In the scripted demo (`/?mock=1`) the visitor answers "It's wavy, and quite dry at the ends." and "Yes, add the oil please."; the basket ends at three products (€34.02), the record at 12 of 12, and the field for the address appears 81 seconds after Begin.
- **Tests:** 298 backend unit tests, 23 frontend unit tests, the browser test of the scripted journey (61 seconds, then the typed address), and 8 golden conversations against the live models (the main one covers tutorials, the typed address and the recap, with the claims judge on the recap).
