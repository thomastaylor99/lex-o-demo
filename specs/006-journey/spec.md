# 006 Journey: personal reasons, tutorials, email recap

> Status: approved 2026-10-05 (decisions by Thomas). Owner: Thomas. Branch `feat/journey`.

## Goal

Make the discovery feel personal and show L'Oréal leadership what the conversation is worth after the stand: each product says why it suits this visitor, the visitor leaves with tutorials to follow, and their email brings a recap with an in-store offer.

## Decisions

| Topic | Choice |
|---|---|
| Why it suits you | One sentence per product card, built in code from catalogue facts that match the profile (skin type, sensitivity, texture, fragrance-free, SPF, budget), English and French. The brand's approved claim stays on the card as the benefit |
| Tutorials | A bank of real TikTok and YouTube videos (Instagram when found), from the official brand accounts and from creators, a few per product, each link checked; Thomas approves the list (`tutorials.md`). Offered once the routine is complete; cards show platform, creator, title and a QR code |
| Customer record | Adds the email only. After consent, the expert asks for it, reads it back and saves it after confirmation |
| Recap | A model writes a short recap of the discovery from session facts and approved claims only, with an example in-store coupon (code and QR). Shown on screen as an email preview; nothing is sent |
| Privacy | The email is masked on screen and in events (c***@gmail.com) and redacted from logs. Nothing is stored after the session |
| Branch | All of it on `feat/journey`, merged through a pull request |

## Contracts (set before the agents start)

- `ProductView.fit`: string or null (`backend/app/tools/views.py`, `frontend/src/lib/events.ts`), from `fit_sentence(product, profile, language)` in `backend/app/catalogue/fit.py`.
- `BeautyProfile.email`: the masked address, set only by `send_recap`.
- Event `tutorials.shown`: `tutorials`, each `{id, product_ids, brand, platform, creator, creator_kind, title, url, language}`.
- Event `recap.ready`: `email_masked`, `subject`, `body`, `coupon {code, label, valid_until}`.
- Tool `show_tutorials(product_ids)` (`backend/app/tools/tutorials.py`): stores what it showed in `session.flags["shown_tutorials"]` (the views) for the recap.
- Tool `send_recap(email)` (`backend/app/tools/recap_tools.py`): needs consent given; normalises a spoken address, validates it, masks it, writes the recap, emits `profile.updated` and `recap.ready`.
- Data: `backend/app/catalogue/data/tutorials.json`, `{"tutorials": [{id, product_ids, brand, platform, creator, creator_kind, title, url, language, verified_on}]}`.
- Screen state: `tutorialGroups`, `recap`, and transcript entries of kind `tutorials` and `recap` (`frontend/src/lib/voice-agent.ts`).
- Journey steps 6 to 8 in the expert's prompt (`backend/app/agents/prompts.py`).

## Verification

- Unit tests: fit sentences in both languages, the tutorials tool, email normalising and masking, the coupon, log redaction, the recap tool with a fake writer.
- Golden path extended: `show_tutorials` and `send_recap` called, `recap.ready` sent, and every recap sentence checked by the claims judge.
- Browser test of the scripted conversation: the "For you" line, the tutorial cards, the recap and its coupon.
- Thomas runs the journey live and approves the tutorial list.

## As built (2026-10-05)

- **Why it suits you:** a compact pattern under 100 characters, "For dry, sensitive skin: the rich texture you like, fragrance-free, within your budget." Skin concerns stay out (any wording reads as a benefit); the budget reads "within your budget"; search results use the search's own criteria, which reach the tool before the extractor updates the profile.
- **Tutorial cards:** each card is a link that opens its video in a new tab, with a "Watch" pill beside the QR code, so the presenter can play it on the computer while the conversation keeps running (Thomas, after the first live run).
- **Tutorials:** 18 videos, each checked through the platform's oEmbed (`tutorials.md`, awaiting Thomas's approval). At most four per call, one per product before any second, the session language first. Titles on screen and in the recap lose hashtags, emoji and capitals used for shouting, and keep brand spelling (`backend/app/catalogue/titles.py`). A note in the turn context asks for `show_tutorials` once two or more products are in the basket, because the prompt step alone was skipped.
- **Email:** `send_recap` reads the address back first, in words ("camille dot martin at example dot com"), and writes the recap only when the same address comes back in a later turn. The address is masked in events, in `tool.started` (`Tool.public_args`) and in logs, written or spoken; the expert never reads it aloud after.
- **Recap:** written by the model with structured output, then checked: quotations must be exact approved claims, fit sentences unchanged, the body ends with the code and stays under 140 words. Otherwise, or after 6 s, a template writes it. The filler line "One moment, I'm preparing your recap." covers the call.
- **Coupon:** "LEX-" and four characters derived from the session id, an example 10% in-store offer valid 30 days.
- **Tests:** 290 backend unit tests, 21 frontend unit tests, the browser test of the 71-second scripted journey, and 7 golden conversations against the live models (the main one now covers tutorials, read-back and recap, with the claims judge on the recap).
