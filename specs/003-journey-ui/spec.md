# 003 Journey and UI (V1 screen)

> Status: approved 2026-10-04 (decisions by Thomas), revised the same evening after his first live run, after two rounds of templates, and for the first skin (Frost with Lumen's agent labels). Owner: Thomas. Last updated: 2026-10-04.

## Goal

The conversation Thomas tested in the terminal, in the browser, on a screen worthy of a projector in front of L'Oréal leadership: live transcription, the agent speaking, the products it recommends, the basket and the customer record filling in as the visitor talks. Built on the backend API (spec 001) with no change to the agents.

## Decisions

| Topic | Choice |
|---|---|
| Layout | The conversation takes about three quarters of the width, with product carousels inside it where the expert recommends; the right quarter holds the basket and the customer record (revised after the first live run) |
| Look | Two rounds of templates run under `/templates` (round one: Noir, Atelier, Studio, Clinic, Caption; round two: Ember, Onyx, Lumen, Frost, Duo). The first skin blends Frost and Lumen: Frost's white screen, black pills, black capsule with a yellow waveform, Geist and the yellow #FFD23F accent, with Lumen's agent labels and relay. No background grids or square shapes everywhere, no accent bar on the side of message cards, no monospace or quirky fonts, no beige or ivory |
| Text size | 80% of the Frost template's sizes, never below 13 px: `fs()` in `src/skins/frost/theme.ts` sets every font size |
| Welcome screen | Shown first and again after Restart. Browsers allow the microphone and audio only after a click, so Begin starts the session |
| Restart | A pill in the header ends the session and returns to the welcome screen for the next visitor |
| Customer record | The right panel shows the record L'Oréal would store: each field once captured, and the consent. It shows leadership the zero-party data the conversation collects |
| Agents on screen | By role ("Skincare expert") with a voice visual that moves with the voice; no personas or portraits |
| Camera slot | Designed now: a camera panel opens inside the conversation when the expert asks to see the skin, so the camera (spec 004, V2) fits without a redesign. Its switch shows only when the page has `?camera=1` |
| Stats on screen | Average reply time and p90 (end of speech to first sound), and the running cost of the conversation |
| Talk control | Hands-free by default (listens, answers after a short silence); a switch to hold-to-talk, which the space bar also drives |
| "How voice works" | Not in the app; the slides cover it |
| Size | 1920×1080 projector first; readable from the back of a meeting room |

## Screen

- **Welcome:** the wordmark top left; centred, the black capsule with its yellow waveform at rest, the title ("Your beauty advisor, by voice.", the second half on a yellow marker), one line of body text, the black Begin pill and the note that the voice is not recorded. While the session starts, the pill reads "Connecting" and the waveform travels. A failed start shows a short message (the microphone, or a generic one) and Try again.
- **Header:** "L'Oréal" as a text wordmark (no logo file) and "Beauty advisor"; black pills for the average reply and p90 (from the first reply on) and the running cost; the Restart pill; the camera switch when the page has `?camera=1`.
- **Left, conversation (three quarters):** the black capsule with the active agent's role, its state (listening, thinking, speaking) and a yellow waveform, with Lumen's relay of agent steps beside it ("Welcome", then "Skincare"; the active step black with a yellow dot); the transcript, with the visitor's words appearing live and settling when final, and each agent line under the agent's name with a small yellow dot (pulsing while the line streams, hidden on continued lines); a visible handover moment ("Skincare expert joined"); a product carousel inside the transcript wherever the expert recommends (top pick marked, routine step on routine groups); the camera panel when open; the talk control at the bottom (mode switch, hold button, space bar hint).
- **Right quarter:** the basket (packshot thumbnails, item count, prices, the total in a black pill), then the customer record: a counter ("6 of 9"), nine rows (first name, language, skin type, concerns, sensitivity, texture, budget, routine size, hair) that flash yellow as they fill, and the consent line ("Consent asked before saving", then "Saved with your consent" or "Not saved").
- **Errors:** a problem during the conversation shows a short message in the conversation language for about six seconds; the technical detail stays in a tooltip.
- **Language:** every interface label follows the conversation language (English, French), from `src/components/i18n.ts`.
- **Product images:** `/products/<product id>.png` in `frontend/public/`, on a light well, with the brand's initial if the image is missing.

## Skins

A skin is a folder of components that draws the whole screen from one prop (`src/skins/types.ts`):

```ts
export interface ScreenAgent extends VoiceAgent {
  restart: () => void;       // ends the session; the welcome screen shows for the next visitor
  camera: boolean;           // the V2 camera panel is open
  cameraSwitch: boolean;     // the camera switch is shown (the page has ?camera=1)
  toggleCamera: () => void;
}

export interface SkinProps { agent: ScreenAgent }
```

- `src/hooks/useScreenAgent.ts` turns a `VoiceAgent` into a `ScreenAgent`. Restart calls `end()`, which returns the status to idle. `?camera=1` shows the camera switch and opens the panel; the switch then toggles it.
- `src/components/app/Screen.tsx` renders the skin at `/`: `LiveScreen` feeds it the voice engine (`useVoiceAgent`), `MockScreen` the scripted conversation (`useMockVoiceAgent`, with `?mock=1`). `?autostart=1` starts the session on mount.
- The first skin lives in `src/skins/frost/` (`FrostSkin`). Every skin component takes `{ agent }: SkinProps`, so another template can become a skin without touching the engine.
- The root layout loads Geist as `--font-frost`; `globals.css` holds Tailwind and a minimal reset.

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
  end(): Promise<void>;      // ends the session and returns to idle
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
  costEur: number;           // running cost in euros, from the backend's usage meter (spec 001)
  error: string | null;
}
```

A scripted stand-in (`src/dev/mockVoiceAgent.ts`) returns the same shape from a canned golden-path conversation, so the screen can be designed and reviewed without a backend: `/?mock=1` plays it in the live skin. The templates use it through `src/templates/useDemoAgent.ts`, which adds Replay and the camera toggle (`?camera=1` opens the camera panel).

## Out of scope for this spec

The haircare expert (002 extension), presenter keys and show control (005), the camera itself (004; only its slot is designed here), the "how voice works" view.

## Verification

- Mock: `/?mock=1`, Begin, the scripted conversation plays in the Frost skin, and Restart returns to the welcome screen.
- Live: Thomas runs the golden path in Chrome at 1920×1080. Hands-free and hold-to-talk both work, words appear as he speaks, voices play, cards, basket and customer record fill in, one sentence in French switches the labels to French, the cost rises and the average and p90 update after each turn, Restart then Begin starts a clean conversation, and the screen reads well from a few metres away.
- How to run the app: `README.md`.
