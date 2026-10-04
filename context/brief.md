# Brief

> Source: `~/Professional/Pre Sales/Retail/loreal/agenda-v1.md` (2026-09-08), `technical-qa-prep.md` (2026-09-17), `mancom-oo/agenda.md` (2026-09-24), and Thomas's project notes (2026-09-29). Curated 2026-10-04, personal names removed.

## The event

- L'Oréal Learning Expedition, Wednesday 2026-10-07, 11:00 to 13:00, Mistral office, room 2.11.
- Agenda: Mistral and the AI landscape, AI opportunities across L'Oréal's value chain, then a 20-minute hands-on demo: how voice AI works, live voice cloning with an audience member, product discovery by voice.
- Audience: cross-divisional L'Oréal leadership (research and innovation, supply and operations, marketing and product), possibly with executive committee members. To be confirmed.
- Milestones: v1 due 2026-10-05, the day the slides are validated; event on 2026-10-07.

## Why voice

- L'Oréal's AI strategy has three pillars: Augmented Consumer (Beauty Genius), Augmented Employee, Augmented Sales.
- Beauty Genius has demand and does not scale yet; voice latency is the blocker L'Oréal named. A question expected from the CDMO's team quotes "We're at 40 seconds."
- L'Oréal has no voice assistant today. Voice is the planned wow effect, and a fast answer doubles as a reply to their latency problem.
- A multilingual beauty assistant across owned sites, retail platforms, WhatsApp and human advisors is one of the retail opportunities on the agenda.

## Scope of this app

- Product discovery by voice over a small perimeter of real products (about 20), chosen by Thomas, in the spirit of the Decathlon demo.
- Live voice cloning runs as a separate opener on its own setup. This app only needs a clean handover from it.
- Camera use is open and gets decided with the discovery write-up.
- Journey, perimeter and UI direction come in Thomas's write-up, in a later session.

## Constraints that shape code

- Fast: time to first audio is the number to show.
- Reliable: it runs live in a meeting room, on the office network, with volunteers.
- Defensible: L'Oréal operates under cosmetic claims regulation. See `claims-policy.md`.
- Consent: visitors who speak or appear on camera agree first, and their audio and images are not stored.

## Wording on screen and in prompts

Guardrails from the agenda, for anything the app says or shows:
- Say "autonomy across markets". The word "sovereignty" stays out.
- L'Oréal is treated as advanced: frame everything as building on what they already have.
- No comparisons with other AI vendors.

## Open questions

- The discovery journey, step by step.
- The perimeter: brands, categories, products.
- Whether and how the camera is used.
- Language on stage: French, English, or a switch between them.
