# 003 Journey and UI (V1 screen)

> Status: approved 2026-10-04 (decisions by Thomas), revised the same evening after his first live run, after two rounds of templates, and for the first skin (Frost with Lumen's agent labels); revised 2026-10-05 when the voice moved into the conversation, and 2026-10-06 for Stop. Owner: Thomas. Last updated: 2026-10-06.

## Goal

The conversation Thomas tested in the terminal, in the browser, on a screen worthy of a projector in front of L'Oréal leadership: live transcription, the agent speaking, the products it recommends, the basket and the customer record filling in as the visitor talks. Built on the backend API (spec 001) with no change to the agents.

## Decisions

| Topic | Choice |
|---|---|
| Layout | The conversation takes about three quarters of the width, with product carousels inside it where the expert recommends; the right quarter holds the basket and the customer record (revised after the first live run) |
| Look | Two rounds of templates run under `/templates` (round one: Noir, Atelier, Studio, Clinic, Caption; round two: Ember, Onyx, Lumen, Frost, Duo). The first skin blends Frost and Lumen: Frost's white screen, black pills, Geist and the yellow #FFD23F accent, with Lumen's agent labels. A third round (2026-10-05: header pill, breathing island, voice dock, inline voice, voice line) replaced the black capsule and the relay with the inline voice. No background grids or square shapes everywhere, no accent bar on the side of message cards, no monospace or quirky fonts, no beige or ivory |
| Text size | 80% of the Frost template's sizes, never below 13 px: `fs()` in `src/skins/frost/theme.ts` sets every font size |
| Welcome screen | Shown first and again after Restart. Browsers allow the microphone and audio only after a click, so Begin starts the session. Its look, Eclipse, was chosen on 2026-10-05 from the mockups under `/welcome` |
| Restart | A pill in the header ends the session and returns to the welcome screen for the next visitor |
| Stop | A black pill in the header, left of Restart, while the conversation runs (2026-10-06). It ends the conversation at once and keeps everything on screen; the talk bar says the conversation has ended, and Restart then returns to the welcome screen |
| Customer record | The right panel shows the record L'Oréal would store: each field once captured, and the consent. It shows leadership the zero-party data the conversation collects |
| Agents on screen | By role ("Skincare expert") with a voice visual that moves with the voice; no personas or portraits |
| Voice on screen | Inline (2026-10-05): the voice shows on the lines of the conversation, in one place with one state. The header and the talk bar carry no state text |
| Camera slot | Designed now: a camera panel opens inside the conversation when the expert asks to see the skin, so the camera (spec 004, V2) fits without a redesign. Its switch shows only when the page has `?camera=1` |
| Stats on screen | The conversation's duration, average reply time and p90 (end of speech to first sound), and running cost, at the foot of the right quarter (moved out of the header on 2026-10-05) |
| Talk control | Hands-free by default (listens, answers after a short silence); a switch to hold-to-talk, which the space bar also drives |
| "How voice works" | Not in the app; the slides cover it |
| Size | 1920×1080 projector first; readable from the back of a meeting room |

## Screen

- **Welcome:** Eclipse (`src/welcome/eclipse/`), a warm black screen with faint points of light. L'Oréal's logo top left (the group logo, `src/welcome/LorealLogo.tsx`). Centred, a golden halo that breathes like a voice holds the headline, revealed word by word ("Your beauty, / in your words.", the second line in gold italics, Cormorant Garamond), one line of text and the gold Begin pill. Under the halo, the note that the voice is not recorded; at the bottom, "Built with Mistral AI for the L'Oréal Learning Expedition". While the session starts, the pill reads "Connecting" and the halo shimmers faster. A failed start shows a short message above the pill (the microphone, or a generic one) and Try again.
- **Header:** "Beauty advisor" as the title, top left, after a voice badge (a black disc holding five yellow voice bars), chosen from five options under `/templates/titles`; L'Oréal's logo stays on the welcome screen. On the right, while the conversation runs, the Stop pill (black, with a small yellow square); then the Restart pill, outlined, and the camera switch when the page has `?camera=1`.
- **Left, conversation (three quarters):** the transcript carries the voice. Each agent line sits under the agent's name with a small yellow dot (hidden on continued lines). While a line is spoken, a small yellow waveform on a black pill and the state ("Thinking", "Speaking") follow the name, then fade when the voice moves on. While the agent's next line is on its way, its label waits at the bottom with a thinking wave and the text rises in under it. While the microphone is open and nothing is heard yet, a "Listening" bubble with a grey swell waits on the right; the visitor's words replace it, appear live and settle when final. The handover is a white pill in the conversation: the previous agent's mark tucked behind the new one's, a yellow ring, "Skincare expert joined". It appears when the previous agent's handover line has played; the new agent's label then waits with a thinking wave, and it speaks 1.2 s later, its words appearing with its voice (`HANDOVER_PAUSE_S` in `src/lib/voice-engine.ts`). Product carousels sit where the expert recommends (top pick marked, routine step on routine groups), tutorials and the recap where they were shown (spec 006); then the camera panel when open, and the talk control at the bottom (the mode switch, and in hold-to-talk the hint and the hold button), with no state text of its own. Once Stop has ended the conversation, a grey pill takes the talk control's place: a black square on a white disc and "The conversation has ended" ("La conversation est terminée"), with no microphone (`src/skins/frost/EndedBar.tsx`). The rule that picks the live line is `src/skins/frost/live.ts`.
- **Right quarter:** the basket (packshot thumbnails, item count, prices, the total in a black pill), then the customer record: a counter ("6 of 12"), twelve rows (first name, email, language, age range, skin type, concerns, sensitivity, texture, budget, routine size, hair, product feedback such as "L'Oréal Paris day cream: too light (disliked)") that flash yellow as they fill, and the consent line ("Consent asked before saving", then "Saved with your consent" or "Not saved"); at the foot and always in view, "This conversation": light grey bubbles for its duration, the average reply and p90 (from the first reply on) and the running cost.
- **Stop and the ended state:** Stop ends the conversation at once: the voice stops mid-word, the microphone and the transcription sockets close, pending requests are aborted and the backend session ends (`DELETE /sessions/{id}`, as Restart does). Everything on screen stays as it stood, lines cut short included: the transcript, the carousels, tutorials and recap, the basket, the customer record and the stats, whose duration stops counting. The status becomes "ended": the voice leaves the lines, the email field closes, and the talk bar says the conversation has ended. Restart then returns to the welcome screen. The live engine (`stop()` in `src/lib/voice-engine.ts`) and the scripted demo (`/?mock=1`) behave the same.
- **Errors:** a problem during the conversation shows a short message in the conversation language for about six seconds; the technical detail stays in a tooltip.
- **Language:** every interface label follows the conversation language (English, French), from `src/components/i18n.ts`.
- **Product images:** `/products/<product id>.png` in `frontend/public/`, on a light well, with the brand's initial if the image is missing.
- **Product carousels:** the row snaps card by card and shows arrows when it overflows. A card lifts under the pointer, its "+" turning yellow, and a click opens the product sheet over the conversation: the packshot large, brand, name, price and price per 100 ml, texture, SPF, fragrance-free and size, why it suits the visitor, every approved claim and usage note quoted, and a code to scan for the product page. Escape, the cross or a click outside closes it; the conversation keeps running underneath (`src/skins/frost/ProductDetail.tsx`).

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

- `src/hooks/useScreenAgent.ts` turns a `VoiceAgent` into a `ScreenAgent`. Restart calls `end()`, which returns the status to idle; Stop calls the agent's `stop()`. `?camera=1` shows the camera switch and opens the panel; the switch then toggles it.
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
  status: "idle" | "starting" | "live" | "ended" | "error";   // "ended": after Stop, until Restart
  activity: AgentActivity;
  mode: MicMode;
  setMode(mode: MicMode): void;
  start(): Promise<void>;    // creates the session, prefetches lines, plays the welcome
  stop(): Promise<void>;     // ends the session at once and keeps the screen: status "ended"
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

- Mock: `/?mock=1`, Begin, the scripted conversation plays in the Frost skin: the waveform moves from line to line with the speaker, the handover pill appears, and Restart returns to the welcome screen. Stop during the expert's first line freezes the screen and the duration, and the talk bar says the conversation has ended (`tests/e2e/stop.spec.ts`).
- Live: Thomas runs the golden path in Chrome at 1920×1080. Hands-free and hold-to-talk both work, words appear as he speaks, voices play, cards, basket and customer record fill in, one sentence in French switches the labels to French, the cost rises and the average and p90 update after each turn, Restart then Begin starts a clean conversation, Stop during a reply silences the voice at once and turns the browser's microphone indicator off while the screen stays, and the screen reads well from a few metres away.
- How to run the app: `README.md`.
