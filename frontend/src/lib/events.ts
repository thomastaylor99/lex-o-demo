/**
 * Stream event contract (spec 001).
 *
 * Mirrors `backend/app/conversation/events.py` field for field, including its
 * snake_case names. This is the single source of truth for stream event
 * types in the frontend: per `AGENTS.md`, nothing outside this file may
 * redefine them.
 */

export type Language = "en" | "fr";

// --- Payload types -----------------------------------------------------

export type Division =
  | "consumer_products"
  | "luxe"
  | "dermatological_beauty"
  | "professional_products";

/** A single approved claim or usage note, as quoted for the session language. */
export interface ProductClaim {
  id: string;
  text: string;
}

/** `backend/app/catalogue/views.py::product_view`. Carried by `products.shown`. */
export interface ProductView {
  id: string;
  brand: string;
  division: Division;
  name: string;
  category: string;
  routine_step: string;
  texture: string;
  spf: number | null;
  fragrance_free: boolean | null;
  size_ml: number;
  price_eur: number;
  url: string;
  claims: ProductClaim[];
  usage_notes: ProductClaim[];
}

/** `backend/app/catalogue/basket.py::BasketItem`. Carried by `basket.updated`. */
export interface BasketItem {
  product_id: string;
  brand: string;
  name: string;
  division: Division;
  price_eur: number;
}

export type SkinType = "dry" | "normal" | "combination" | "oily";
export type TexturePreference = "rich" | "light";
export type BudgetBand = "under_20" | "20_to_40" | "40_to_80" | "over_80";
export type RoutineSize = "minimal" | "standard" | "full";
export type HairType = "straight" | "wavy" | "curly" | "coily";
export type Consent = "pending" | "given" | "declined";

/** `backend/app/profile/models.py::BeautyProfile`. Carried by `profile.updated`. */
export interface BeautyProfile {
  language: Language | null;
  first_name: string | null;
  skin_type: SkinType | null;
  concerns: string[];
  sensitive: boolean | null;
  texture_preference: TexturePreference | null;
  budget_band: BudgetBand | null;
  routine_size: RoutineSize | null;
  fragrance_free: boolean | null;
  hair_type: HairType | null;
  hair_concerns: string[];
  consent: Consent;
}

export interface ModelCallTiming {
  agent: string;
  first_token_ms: number | null;
  duration_ms: number;
}

export interface ToolTiming {
  name: string;
  duration_ms: number;
}

export interface TurnTimings {
  model_calls: ModelCallTiming[];
  tools: ToolTiming[];
  total_ms: number;
}

// --- Events --------------------------------------------------------------

interface EventBase {
  turn_id: string;
  /** Milliseconds since turn.started. */
  t_ms: number;
}

export interface TurnStarted extends EventBase {
  type: "turn.started";
  agent: string;
  language: string;
}

export interface TextDelta extends EventBase {
  type: "text.delta";
  agent: string;
  text: string;
}

export interface ToolStarted extends EventBase {
  type: "tool.started";
  call_id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ToolFinished extends EventBase {
  type: "tool.finished";
  call_id: string;
  name: string;
  ok: boolean;
  duration_ms: number;
}

export interface LinePlay extends EventBase {
  type: "line.play";
  agent: string;
  line: string;
}

export interface AgentSwitched extends EventBase {
  type: "agent.switched";
  from_agent: string;
  to_agent: string;
}

export interface ProductsShown extends EventBase {
  type: "products.shown";
  products: ProductView[];
  best_match_id: string | null;
}

export interface BasketUpdated extends EventBase {
  type: "basket.updated";
  items: BasketItem[];
  total_eur: number;
}

/** The basket shape alone, without the event envelope — for hook and component state. */
export type Basket = Pick<BasketUpdated, "items" | "total_eur">;

export interface ProfileUpdated extends EventBase {
  type: "profile.updated";
  profile: BeautyProfile;
}

export interface TurnDone extends EventBase {
  type: "turn.done";
  timings: TurnTimings;
  /** The session's running cost so far, in euros (speech-to-text, the models, text-to-speech). */
  cost_eur: number;
}

export interface ErrorEvent extends EventBase {
  type: "error";
  message: string;
  recoverable: boolean;
}

export type StreamEvent =
  | TurnStarted
  | TextDelta
  | ToolStarted
  | ToolFinished
  | LinePlay
  | AgentSwitched
  | ProductsShown
  | BasketUpdated
  | ProfileUpdated
  | TurnDone
  | ErrorEvent;

/**
 * One key per `StreamEvent["type"]`. The `satisfies` clause makes this a
 * compile error whenever a variant is added to `StreamEvent` and not listed
 * here, so the set below can never silently fall out of date.
 */
const EVENT_TYPES = {
  "turn.started": true,
  "text.delta": true,
  "tool.started": true,
  "tool.finished": true,
  "line.play": true,
  "agent.switched": true,
  "products.shown": true,
  "basket.updated": true,
  "profile.updated": true,
  "turn.done": true,
  error: true,
} as const satisfies Record<StreamEvent["type"], true>;

/**
 * Parses one SSE frame's `data` payload. Throws on an unknown `type`.
 * Malformed JSON throws `SyntaxError` (from `JSON.parse`).
 */
export function parseEvent(json: string): StreamEvent {
  const data: unknown = JSON.parse(json);
  if (
    typeof data !== "object" ||
    data === null ||
    !("type" in data) ||
    typeof (data as { type: unknown }).type !== "string" ||
    !Object.hasOwn(EVENT_TYPES, (data as { type: string }).type)
  ) {
    const type = typeof data === "object" && data !== null && "type" in data
      ? (data as { type: unknown }).type
      : undefined;
    throw new Error(`Unknown stream event type: ${String(type)}`);
  }
  return data as StreamEvent;
}
