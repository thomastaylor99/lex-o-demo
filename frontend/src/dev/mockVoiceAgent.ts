"use client";

/**
 * Dev fixture: a scripted golden-path conversation behind the `VoiceAgent` contract, for design
 * work without a backend (`/?mock=1`). Products, prices and claims come from the real catalogue
 * (`backend/app/catalogue/data/products.json`, English).
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { MicMode } from "@/lib/api";
import type { Basket, BeautyProfile, ProductView } from "@/lib/events";
import {
  EMPTY_REPLY_STATS,
  replyStats,
  type AgentIdentity,
  type ProductGroup,
  type TranscriptEntry,
  type VoiceAgent,
} from "@/lib/voice-agent";

type State = Omit<VoiceAgent, "setMode" | "start" | "end" | "pttDown" | "pttUp">;
type Step = { at: number; apply: (s: State) => State };

const AGENTS: AgentIdentity[] = [
  { id: "concierge", displayName: "Beauty concierge", roleLabel: "Welcome" },
  { id: "skincare", displayName: "Skincare expert", roleLabel: "Skincare" },
];

const product = (p: Omit<ProductView, "claims" | "usage_notes"> & { claim: string; note: string }): ProductView => ({
  ...p,
  claims: [{ id: `${p.id}-claim`, text: p.claim }],
  usage_notes: [{ id: `${p.id}-note`, text: p.note }],
});

const TOLERIANE = product({
  id: "lrp-toleriane-sensitive-riche",
  brand: "La Roche-Posay",
  division: "dermatological_beauty",
  name: "Toleriane Sensitive Rich Moisturiser",
  category: "moisturiser",
  routine_step: "moisturise",
  texture: "rich_cream",
  spf: null,
  fragrance_free: true,
  size_ml: 40,
  price_eur: 14.17,
  url: "https://www.laroche-posay.co.uk/en_GB/toleriane-sensitive-skin-moisturiser/LRP_129.html",
  claim:
    "The high tolerance moisturiser effectively repairs and protects skin's barrier while reducing signs of discomfort, including tightness, tingling, dryness and occasional redness.",
  note: "Apply to the face and the neck morning and evening.",
});

const CERAVE_CREAM = product({
  id: "cerave-moisturising-cream",
  brand: "CeraVe",
  division: "dermatological_beauty",
  name: "Moisturising Cream",
  category: "moisturiser",
  routine_step: "moisturise",
  texture: "rich_cream",
  spf: null,
  fragrance_free: true,
  size_ml: 454,
  price_eur: 13.89,
  url: "https://www.cerave.co.uk/skincare/moisturisers/moisturising-cream",
  claim: "Rich cream which helps hydrate & protect the skin's natural barrier",
  note: "Apply liberally as often as needed, or as directed by a physician",
});

const CERAVE_SPF30 = product({
  id: "cerave-spf30-moisturiser",
  brand: "CeraVe",
  division: "dermatological_beauty",
  name: "AM Facial Moisturising Lotion SPF30",
  category: "moisturiser",
  routine_step: "moisturise",
  texture: "light_cream",
  spf: 30,
  fragrance_free: true,
  size_ml: 52,
  price_eur: 14.21,
  url: "https://www.cerave.co.uk/skincare/moisturisers/am-facial-moisturising-lotion-spf30",
  claim: "Protects against broad spectrum UVA/UVB rays with SPF30, in line with NHS recommendation.",
  note: "Apply liberally to face and neck in the morning.",
});

const CERAVE_CLEANSER = product({
  id: "cerave-hydrating-cleanser",
  brand: "CeraVe",
  division: "dermatological_beauty",
  name: "Hydrating Cleanser",
  category: "cleanser",
  routine_step: "cleanse",
  texture: "light_cream",
  spf: null,
  fragrance_free: true,
  size_ml: 236,
  price_eur: 7.45,
  url: "https://www.cerave.co.uk/skincare/cleansers/hydrating-cleanser",
  claim: "Gently removes dirt, oil and makeup without leaving skin tight or dry",
  note: "Wet skin with lukewarm water",
});

const ANTHELIOS = product({
  id: "lrp-anthelios-uvmune400-ff",
  brand: "La Roche-Posay",
  division: "dermatological_beauty",
  name: "Anthelios UVMune 400 Invisible Fluid SPF50+",
  category: "sunscreen",
  routine_step: "protect",
  texture: "fluid",
  spf: 50,
  fragrance_free: true,
  size_ml: 50,
  price_eur: 13.4,
  url: "https://www.laroche-posay.co.uk/en_GB/anthelios-uvmune-400-invisible-fluid-spf50-sun-cream-for-sensitive-skin-50ml/LRP_026.html",
  claim: "A very high protection, broad spectrum (SPF 50+)",
  note: "Shake before use.",
});

const EMPTY_PROFILE: BeautyProfile = {
  language: "en",
  first_name: null,
  skin_type: null,
  concerns: [],
  sensitive: null,
  texture_preference: null,
  budget_band: null,
  routine_size: null,
  fragrance_free: null,
  hair_type: null,
  hair_concerns: [],
  consent: "pending",
};

const INITIAL: State = {
  status: "idle",
  activity: "idle",
  mode: "auto",
  language: "en",
  activeAgent: null,
  agents: AGENTS,
  transcript: [],
  productGroups: [],
  basket: { items: [], total_eur: 0 },
  profile: null,
  lastReplyMs: null,
  replyStats: EMPTY_REPLY_STATS,
  costEur: 0,
  error: null,
};

/** Reply times (ms) and running conversation cost (EUR) after each turn of the script. */
const REPLY_MS = [450, 600, 520, 640, 580, 610];
const COST_EUR = [0.004, 0.009, 0.015, 0.021, 0.026, 0.031];

// ------------------------------------------------------------------ script builders

let counter = 0;
const nextId = () => `mock-${++counter}`;

const set =
  (patch: Partial<State>): Step["apply"] =>
  (s) => ({ ...s, ...patch });

const updateProfile =
  (patch: Partial<BeautyProfile>): Step["apply"] =>
  (s) => ({ ...s, profile: { ...(s.profile ?? EMPTY_PROFILE), ...patch } });

const addToBasket =
  (...products: ProductView[]): Step["apply"] =>
  (s) => {
    const items = [
      ...s.basket.items,
      ...products.map((p) => ({ product_id: p.id, brand: p.brand, name: p.name, division: p.division, price_eur: p.price_eur })),
    ];
    const basket: Basket = { items, total_eur: Math.round(items.reduce((sum, i) => sum + i.price_eur, 0) * 100) / 100 };
    return { ...s, basket };
  };

/** A product group, shown both in the discovery data and as an inline carousel in the transcript. */
const show = (kind: ProductGroup["kind"], products: ProductView[], bestMatchId: string | null): Step["apply"] => {
  const groupId = nextId();
  const entryId = nextId();
  return (s) => ({
    ...s,
    productGroups: [...s.productGroups, { id: groupId, kind, products, bestMatchId }],
    transcript: [...s.transcript, { id: entryId, kind: "products", agent: "skincare", text: "", final: true, groupId }],
  });
};

/** The nth turn's reply: last reply time, the stats so far and the running cost. */
const reply =
  (turn: number): Step["apply"] =>
  (s) => ({
    ...s,
    lastReplyMs: REPLY_MS[turn],
    replyStats: replyStats(REPLY_MS.slice(0, turn + 1)),
    costEur: COST_EUR[turn],
  });

/** Words that appear one by one in a new entry, then settle as final. */
function stream(at: number, kind: "visitor" | "agent", agent: string | null, text: string, perWordMs: number): Step[] {
  const id = nextId();
  const words = text.split(" ");
  const steps: Step[] = words.map((_, i) => ({
    at: at + i * perWordMs,
    apply: (s) => {
      const entry: TranscriptEntry = { id, kind, agent, text: words.slice(0, i + 1).join(" "), final: false };
      const exists = s.transcript.some((e) => e.id === id);
      return {
        ...s,
        transcript: exists ? s.transcript.map((e) => (e.id === id ? entry : e)) : [...s.transcript, entry],
      };
    },
  }));
  steps.push({
    at: at + words.length * perWordMs,
    apply: (s) => ({ ...s, transcript: s.transcript.map((e) => (e.id === id ? { ...e, final: true } : e)) }),
  });
  return steps;
}

const hear = (at: number, text: string) => [
  { at, apply: set({ activity: "listening" }) },
  ...stream(at, "visitor", null, text, 190),
];

const say = (at: number, agent: string, text: string) => [
  { at, apply: set({ activity: "speaking" }) },
  ...stream(at, "agent", agent, text, 120),
];

const line = (at: number, agent: string, text: string): Step => ({
  at,
  apply: (s) => ({
    ...s,
    activity: "speaking",
    transcript: [...s.transcript, { id: nextId(), kind: "agent", agent, text, final: true }],
  }),
});

const handover = (at: number, to: AgentIdentity): Step => ({
  at,
  apply: (s) => ({
    ...s,
    activeAgent: to,
    transcript: [...s.transcript, { id: nextId(), kind: "handover", agent: to.id, text: to.displayName, final: true }],
  }),
});

function script(): Step[] {
  const [concierge, skincare] = AGENTS;
  return [
    { at: 0, apply: set({ status: "live", activeAgent: concierge }) },
    ...say(200, "concierge", "Welcome to L'Oréal! I'm your AI beauty concierge. What are you looking for today?"),
    ...hear(3800, "Hi! I'm looking for a moisturiser, my skin has been feeling really tight lately."),
    { at: 7000, apply: set({ activity: "thinking" }) },
    line(7450, "concierge", "Lovely. Let me bring in our skincare expert."),
    { at: 7450, apply: reply(0) },
    handover(9000, skincare),
    ...say(
      9300,
      "skincare",
      "I'm L'Oréal's AI skincare expert. Tight skin is usually asking for hydration. Does it also react or redden easily?",
    ),
    { at: 9800, apply: updateProfile({ skin_type: "dry" }) },
    ...hear(12600, "It's dry, mostly on my cheeks, and it gets red quite easily."),
    { at: 15400, apply: set({ activity: "thinking" }) },
    { at: 15500, apply: updateProfile({ skin_type: "dry", sensitive: true, concerns: ["sensitivity"] }) },
    { at: 16000, apply: reply(1) },
    ...say(16000, "skincare", "Thank you, that helps. Do you enjoy rich creams, and is there a budget you'd like to keep to?"),
    ...hear(19600, "I love rich creams, around twenty five euros."),
    { at: 21600, apply: set({ activity: "thinking" }) },
    line(22100, "skincare", "Let me look through our range for you."),
    { at: 22100, apply: reply(2) },
    { at: 22900, apply: show("recommendation", [TOLERIANE, CERAVE_CREAM, CERAVE_SPF30], TOLERIANE.id) },
    { at: 23000, apply: updateProfile({ texture_preference: "rich", budget_band: "20_to_40" }) },
    ...say(
      23600,
      "skincare",
      "My top pick for you is La Roche-Posay Toleriane Sensitive Rich Moisturiser. It reduces tightness, dryness and occasional redness while protecting your skin's barrier. Two alternatives are on screen. What do you think?",
    ),
    ...hear(31000, "The first one sounds perfect, I'll take it."),
    { at: 33000, apply: set({ activity: "thinking" }) },
    { at: 33400, apply: addToBasket(TOLERIANE) },
    { at: 33600, apply: show("routine", [CERAVE_CLEANSER, ANTHELIOS], null) },
    { at: 33700, apply: reply(3) },
    ...say(
      33700,
      "skincare",
      "Lovely choice, it's in your selection. To complete your routine, the CeraVe Hydrating Cleanser cleanses without leaving skin tight or dry. Shall I add it?",
    ),
    ...hear(40000, "Yes please, add the cleanser."),
    { at: 41600, apply: set({ activity: "thinking" }) },
    { at: 42000, apply: addToBasket(CERAVE_CLEANSER) },
    { at: 42100, apply: reply(4) },
    ...say(42100, "skincare", "Done. Would you like me to save your skin profile and routine for next time?"),
    ...hear(46000, "Yes, please save it. My name is Camille."),
    { at: 48400, apply: set({ activity: "thinking" }) },
    { at: 48800, apply: updateProfile({ first_name: "Camille", routine_size: "minimal", consent: "given" }) },
    { at: 48900, apply: reply(5) },
    ...say(48900, "skincare", "Thank you, Camille. Your profile and routine are saved. Enjoy your new ritual."),
    { at: 53000, apply: set({ activity: "listening" }) },
  ];
}

// ------------------------------------------------------------------ hook

export function useMockVoiceAgent(): VoiceAgent {
  const [state, setState] = useState<State>(INITIAL);
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };
  useEffect(() => clear, []);

  const start = useCallback(async () => {
    clear();
    setState({ ...INITIAL, status: "starting" });
    for (const step of script()) {
      timers.current.push(window.setTimeout(() => setState(step.apply), 600 + step.at));
    }
  }, []);

  const end = useCallback(async () => {
    clear();
    setState(INITIAL);
  }, []);

  const setMode = useCallback((mode: MicMode) => setState((s) => ({ ...s, mode })), []);
  const pttDown = useCallback(() => setState((s) => ({ ...s, activity: "listening" })), []);
  const pttUp = useCallback(() => setState((s) => ({ ...s, activity: "thinking" })), []);

  return { ...state, start, end, setMode, pttDown, pttUp };
}
