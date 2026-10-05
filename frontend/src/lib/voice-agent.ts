/**
 * The contract between the voice engine (`src/hooks/useVoiceAgent.ts`) and the screen
 * (spec 003). The screen depends on this shape only; `src/dev/mockVoiceAgent.ts` returns the
 * same shape from a scripted conversation for design work.
 */

import type { MicMode } from "@/lib/api";
import type { Basket, BeautyProfile, Coupon, Language, ProductView, TutorialView } from "@/lib/events";

export type AgentActivity = "idle" | "listening" | "thinking" | "speaking";

export interface TranscriptEntry {
  id: string;
  /**
   * "products", "tutorials" and "recap" mark where a product group, a tutorial group or the
   * email recap appeared in the conversation.
   */
  kind: "visitor" | "agent" | "handover" | "products" | "tutorials" | "recap";
  /** Agent id for agent, handover and products entries, null for the visitor. */
  agent: string | null;
  text: string;
  /** False while the visitor is still speaking or the agent is still streaming. */
  final: boolean;
  /** For "products" and "tutorials" entries: the id of the group shown at this point. */
  groupId?: string;
}

/** Time from the end of the visitor's speech to the first sound, over the turns so far. */
export interface ReplyStats {
  count: number;
  averageMs: number | null;
  p90Ms: number | null;
  minMs: number | null;
  maxMs: number | null;
}

export interface TutorialGroup {
  id: string;
  tutorials: TutorialView[];
}

/** The email recap of the discovery, shown as a preview (spec 006). */
export interface Recap {
  emailMasked: string;
  subject: string;
  body: string;
  coupon: Coupon;
}

export interface ProductGroup {
  /** Turn id plus index. */
  id: string;
  /** "recommendation" when the event had a best match, "routine" otherwise. */
  kind: "recommendation" | "routine";
  products: ProductView[];
  bestMatchId: string | null;
}

export interface AgentIdentity {
  id: string;
  displayName: string;
  roleLabel: string;
}

export interface VoiceAgent {
  status: "idle" | "starting" | "live" | "error";
  activity: AgentActivity;
  mode: MicMode;
  setMode(mode: MicMode): void;
  /** Creates the session, prefetches the fixed lines and plays the welcome. */
  start(): Promise<void>;
  end(): Promise<void>;
  pttDown(): void;
  pttUp(): void;
  language: Language;
  activeAgent: AgentIdentity | null;
  agents: AgentIdentity[];
  transcript: TranscriptEntry[];
  productGroups: ProductGroup[];
  tutorialGroups: TutorialGroup[];
  recap: Recap | null;
  basket: Basket;
  profile: BeautyProfile | null;
  /** Time from the end of the visitor's speech to the first sound of the last turn, in ms. */
  lastReplyMs: number | null;
  replyStats: ReplyStats;
  /** Running cost of this conversation (speech-to-text, the models, text-to-speech), in euros. */
  costEur: number;
  error: string | null;
}

export const EMPTY_REPLY_STATS: ReplyStats = { count: 0, averageMs: null, p90Ms: null, minMs: null, maxMs: null };

/** Average, 90th percentile and range of reply times. */
export function replyStats(samples: number[]): ReplyStats {
  if (samples.length === 0) return EMPTY_REPLY_STATS;
  const sorted = [...samples].sort((a, b) => a - b);
  const p90 = sorted[Math.min(sorted.length - 1, Math.ceil(0.9 * sorted.length) - 1)];
  return {
    count: sorted.length,
    averageMs: Math.round(sorted.reduce((sum, value) => sum + value, 0) / sorted.length),
    p90Ms: p90,
    minMs: sorted[0],
    maxMs: sorted[sorted.length - 1],
  };
}
