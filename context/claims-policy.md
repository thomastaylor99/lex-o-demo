# Claims policy

> Source: `~/Professional/Pre Sales/Retail/loreal/technical-qa-prep.md`, section on regulated claims (2026-09-17). Curated 2026-10-04.

L'Oréal operates under cosmetic claims regulation. An assistant that voices an unsupported efficacy claim creates legal exposure, and the audience includes people who will notice.

## Rules

1. Every catalogue product carries `approved_claims`: short statements quoted from the brand's own product page, each stored with its source URL and the date it was copied.
2. The agent voices product benefits only from `approved_claims` returned by a tool in the current conversation. Its general knowledge about a product stays out of what it says.
3. When a visitor asks about something no approved claim covers, the agent says it cannot confirm that and moves the conversation forward.
4. Medical or therapeutic wording (treats, cures, heals) and comparisons with competitor products stay out.
5. Prices, shades and sizes come from the catalogue only.

## How it is enforced

- The system prompt states rules 2 to 4.
- Tool results return claims verbatim, so the model has the approved wording at hand.
- Golden conversations assert that every claim-bearing sentence matches an approved claim of a product returned in that conversation.

## Why it matters for the pitch

The prep notes expect the question "How do we guarantee it stays on-brand and doesn't say something we can't defend?" The answer is a claims registry, grounded generation and a verifier. The demo shows a small working version of that.
