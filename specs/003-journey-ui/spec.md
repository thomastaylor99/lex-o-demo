# 003 Journey and UI (V1 screen)

> Status: approved 2026-10-04 (decisions by Thomas), revised the same evening after his first live run and after the first round of templates. Owner: Thomas. Last updated: 2026-10-04.

## Goal

The conversation Thomas tested in the terminal, in the browser, on a screen worthy of a projector in front of L'Oréal leadership: live transcription, the agent speaking, the products it recommends, the basket and the customer record filling in as the visitor talks. Built on the backend API (spec 001) with no change to the agents.

## Decisions

| Topic | Choice |
|---|---|
| Layout | The conversation takes about three quarters of the width, with product carousels inside it where the expert recommends; the right quarter holds the basket and the customer record (revised after the first live run) |
| Look | Round one (Noir, Atelier, Studio, Clinic, Caption) narrowed the direction to a blend of Clinic and Studio: rounded, clean surfaces in black and amber or in white. No background grids or square shapes everywhere, no accent bar on the side of message cards, no monospace or quirky fonts, no beige or ivory. Round two (Ember and Onyx dark, Lumen and Frost light, Duo hybrid) runs under `/templates` |
| Customer record | The right panel shows the record L'Oréal would store: each field once captured, and the consent. It shows leadership the zero-party data the conversation collects |
| Agents on screen | By role ("Skincare expert") with a voice visual that moves with the voice; no personas or portraits |
| Camera slot | Designed now: a camera panel opens inside the conversation when the expert asks to see the skin, so the camera (spec 004, V2) fits without a redesign |
| Stats on screen | Reply time as an average with p90 (or a range), and the running cost of the conversation |
| Talk control | Hands-free by default (listens, answers after a short silence); a switch to hold-to-talk, which the space bar also drives |
| "How voice works" | Not in the app; the slides cover it |
| Size | 1920×1080 projector first; readable from the back of a meeting room |

## Screen

- **Header:** "L'Oréal" as a text wordmark (no logo file), "Beauty advisor", the average reply time with p90 (end of speech to first sound), and the running cost of the conversation.
- **Left, conversation (three quarters):** the active agent's role with its state (listening, thinking, speaking) and a voice visual in the accent colour; the transcript, with the visitor's words appearing live as they speak and settling when final; a visible handover moment ("Skincare expert joined"); a product carousel inside the transcript wherever the expert recommends (top pick marked, routine step on routine groups); the camera panel when open; the talk control at the bottom (mode switch, hold button, "space bar" hint).
- **Right quarter:** the basket (items and total), then the customer record: skin type, concerns, sensitivity, texture, budget, routine size, hair and first name as they get captured, and the consent state at the end ("Saved with consent" or "Not saved").
- **Language:** the few interface labels follow the conversation language (English, French).
- **Product images:** `/products/<product id>.png` in `frontend/public/`, on a white or light well.

## Contract between the voice engine and the screen

`frontend/src/hooks/useVoiceAgent.ts` returns this shape (`src/lib/voice-agent.ts`, with types from `src/lib/events.ts` and `src/lib/api.ts`). The screen depends on nothing else.

```ts
export type AgentActivity = "idle" | "listening" | "thinking" | "speaking";

export interface TranscriptEntry {
  id: string;
  kind: "visitor" | "agent" | "handover" | "products";
  agent: string | null;      // agent id for agent, handover and products entries
  text: string;
  final: boolean;            // false while the visitor is still speaking or the agent still streaming
  groupId?: string;          // products entries: the ProductGroup shown at this point
}

export interface ProductGroup {
  id: string;
  kind: "recommendation" | "routine";   // best_match_id set, or null
  products: ProductView[];
  bestMatchId: string | null;
}

export interface ReplyStats { count: number; averageMs: number | null; p90Ms: number | null; minMs: number | null; maxMs: number | null }

export interface AgentIdentity { id: string; displayName: string; roleLabel: string }

export interface VoiceAgent {
  status: "idle" | "starting" | "live" | "error";
  activity: AgentActivity;
  mode: MicMode;
  setMode(mode: MicMode): void;
  start(): Promise<void>;    // creates the session, prefetches lines, plays the welcome
  end(): Promise<void>;
  pttDown(): void;
  pttUp(): void;
  language: Language;
  activeAgent: AgentIdentity | null;
  agents: AgentIdentity[];
  transcript: TranscriptEntry[];
  productGroups: ProductGroup[];
  basket: Basket;
  profile: BeautyProfile | null;
  lastReplyMs: number | null;
  replyStats: ReplyStats;
  costEur: number;           // running cost; 0 until the backend reports usage
  error: string | null;
}
```

A scripted stand-in (`src/dev/mockVoiceAgent.ts`, used when the page has `?mock=1`) returns the same shape from a canned golden-path conversation, so the screen can be designed and reviewed without a backend. The templates use it through `src/templates/useDemoAgent.ts`, which adds Replay and the camera toggle (`?camera=1` opens the camera panel).

## Out of scope for this spec

The haircare expert (002 extension), presenter keys and reset between volunteers (005), the camera itself (004; only its slot is designed here), the "how voice works" view.

## Verification

Thomas runs the golden path in Chrome at 1920×1080: hands-free and hold-to-talk both work, words appear as he speaks, voices play, cards, basket and customer record fill in, and the screen reads well from a few metres away.
