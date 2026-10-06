"use client";

/**
 * Dev fixture: a scripted golden-path conversation behind the `VoiceAgent` contract, for design
 * work without a backend (`/?mock=1`). Products, prices and claims come from the real catalogue
 * (`backend/app/catalogue/data/products.json`, English); each "For you" sentence is what
 * `fit_sentence` gives for the mock profile. The tutorials link to the brands' official accounts.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { MicMode } from "@/lib/api";
import { looksLikeEmail } from "@/lib/email";
import type { Basket, BeautyProfile, ProductFeedback, ProductView, TutorialView } from "@/lib/events";
import {
  EMPTY_REPLY_STATS,
  replyStats,
  settled,
  type AgentIdentity,
  type EmailResult,
  type ProductGroup,
  type Recap,
  type TranscriptEntry,
  type VoiceAgent,
} from "@/lib/voice-agent";

type State = Omit<VoiceAgent, "setMode" | "start" | "stop" | "end" | "pttDown" | "pttUp" | "submitEmail">;
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
  fit: "For dry, sensitive skin: the rich texture you like, within your budget.",
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
  fit: "For dry, sensitive skin: the rich texture you like, within your budget.",
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
  fit: "For dry, sensitive skin: within your budget.",
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
  fit: "For dry, sensitive skin: within your budget.",
});

/** The hair bridge after the tutorials (spec 002, Cross-sell): the oil first, its shampoo beside it. */
const ELVIVE_OIL = product({
  id: "lop-elseve-extraordinary-oil",
  brand: "L'Oréal Paris",
  division: "consumer_products",
  name: "Elvive Extraordinary Oil",
  category: "haircare",
  routine_step: "hair",
  texture: "oil",
  spf: null,
  fragrance_free: false,
  size_ml: 100,
  price_eur: 12.4,
  url: "https://www.loreal-paris.co.uk/elvive/extraordinary-oil/extraordinary-oil",
  claim:
    "Enriched with a precious blend of 6 flower extracts the non-greasy feel formula leaves hair looking soft, shiny and weightless.",
  note: "Use before shampooing for nourishment.",
  fit: "For dry hair: within your budget.",
});

const ELVIVE_SHAMPOO = product({
  id: "lop-elseve-extraordinary-oil-shampoo",
  brand: "L'Oréal Paris",
  division: "consumer_products",
  name: "Elvive Extraordinary Oil Nourishing Shampoo",
  category: "haircare",
  routine_step: "hair",
  texture: "shampoo",
  spf: null,
  fragrance_free: false,
  size_ml: 250,
  price_eur: 6.6,
  url: "https://www.loreal-paris.co.uk/elvive/extraordinary-oil/oil-shampoo-dry-hair",
  claim: "Hair feels softer and looks healthier",
  note: "Apply on wet hair, massage your scalp and rinse.",
  fit: "For dry hair: within your budget.",
});

/** Tutorials for the routine. The brands' official accounts stand in until Thomas approves the video list. */
const tutorial = (t: Omit<TutorialView, "creator_kind" | "language">): TutorialView => ({ ...t, creator_kind: "brand", language: "en" });

const TUTORIALS: TutorialView[] = [
  tutorial({
    id: "cerave-tiktok",
    product_ids: [CERAVE_CLEANSER.id],
    brand: "CeraVe",
    platform: "tiktok",
    creator: "CeraVe",
    title: "Skincare tips from the CeraVe team",
    url: "https://www.tiktok.com/@cerave",
  }),
  tutorial({
    id: "cerave-youtube",
    product_ids: [CERAVE_CLEANSER.id],
    brand: "CeraVe",
    platform: "youtube",
    creator: "CeraVe",
    title: "How-to videos on the CeraVe channel",
    url: "https://www.youtube.com/@CeraVe",
  }),
  tutorial({
    id: "lrp-tiktok",
    product_ids: [TOLERIANE.id],
    brand: "La Roche-Posay",
    platform: "tiktok",
    creator: "La Roche-Posay",
    title: "Skincare tips from La Roche-Posay",
    url: "https://www.tiktok.com/@larocheposay",
  }),
  tutorial({
    id: "lrp-youtube",
    product_ids: [TOLERIANE.id],
    brand: "La Roche-Posay",
    platform: "youtube",
    creator: "La Roche-Posay",
    title: "How-to videos on the La Roche-Posay channel",
    url: "https://www.youtube.com/@LaRochePosayUS",
  }),
];

/** The email recap, from the mock facts and the approved claims. Nothing is sent. */
const RECAP: Recap = {
  emailMasked: "c***@example.com",
  subject: "Your skincare routine, Camille",
  body: [
    "Hi Camille, thank you for your visit today. You told us your skin feels dry and tight, reddens easily, and that you love rich creams.",
    "Your routine: cleanse with the CeraVe Hydrating Cleanser, then apply La Roche-Posay Toleriane Sensitive Rich Moisturiser morning and evening. It repairs and protects skin's barrier while reducing signs of discomfort.",
    "For your wavy, dry hair, L'Oréal Paris Elvive Extraordinary Oil leaves hair looking soft, shiny and weightless.",
    "Find more from CeraVe and La Roche-Posay on TikTok and YouTube, and show the code below in store for your offer.",
  ].join("\n\n"),
  coupon: { code: "LEX-7Q2M", label: "Example offer: 10% off this routine in store", valid_until: "2026-11-04" },
};

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
  age_range: null,
  product_feedback: [],
  consent: "pending",
  email: null,
};

/** What the visitor says of the day cream they use now (spec 002, product feedback). */
const DAY_CREAM_FEEDBACK: ProductFeedback = {
  brand: "L'Oréal Paris",
  product: "day cream",
  verdict: "disliked",
  reason: "a bit too light",
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
  tutorialGroups: [],
  recap: null,
  basket: { items: [], total_eur: 0 },
  profile: null,
  lastReplyMs: null,
  replyStats: EMPTY_REPLY_STATS,
  costEur: 0,
  error: null,
};

/** Reply times (ms) and running conversation cost (EUR) after each turn of the script. */
const REPLY_MS = [450, 600, 540, 560, 520, 640, 580, 620, 540, 610];
const COST_EUR = [0.004, 0.009, 0.012, 0.016, 0.021, 0.026, 0.031, 0.035, 0.039, 0.043];
/** The cost once the recap is written: the writer's model call, after the address is typed. */
const RECAP_COST_EUR = 0.046;

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

/** A tutorial group, shown as a row of cards in the transcript. */
const showTutorials = (tutorials: TutorialView[]): Step["apply"] => {
  const groupId = nextId();
  const entryId = nextId();
  return (s) => ({
    ...s,
    tutorialGroups: [...s.tutorialGroups, { id: groupId, tutorials }],
    transcript: [...s.transcript, { id: entryId, kind: "tutorials", agent: "skincare", text: "", final: true, groupId }],
  });
};

/** The email recap, shown as a preview card in the transcript. */
const showRecap = (recap: Recap): Step["apply"] => {
  const entryId = nextId();
  return (s) => ({
    ...s,
    recap,
    transcript: [...s.transcript, { id: entryId, kind: "recap", agent: "skincare", text: "", final: true }],
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

/** The new agent joins and gets ready to speak, as the live engine shows it (HANDOVER_PAUSE_S). */
const handover = (at: number, to: AgentIdentity): Step => ({
  at,
  apply: (s) => ({
    ...s,
    activeAgent: to,
    activity: "thinking",
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
    // The expert joins when the concierge's line ends, and speaks 1.2 s later.
    handover(9900, skincare),
    ...say(
      11100,
      "skincare",
      "I'm L'Oréal's AI skincare expert. Tight skin is usually asking for hydration. Does it also react or redden easily?",
    ),
    { at: 11600, apply: updateProfile({ skin_type: "dry" }) },
    ...hear(14400, "It's dry, mostly on my cheeks, and it gets red quite easily."),
    { at: 17200, apply: set({ activity: "thinking" }) },
    { at: 17300, apply: updateProfile({ skin_type: "dry", sensitive: true, concerns: ["sensitivity"] }) },
    { at: 17800, apply: reply(1) },
    // The concern question (Thomas, 2026-10-06): the record holds what the visitor wants to improve.
    ...say(
      17800,
      "skincare",
      "Thank you, that helps. Is there anything you'd most like to improve for your skin, such as hydration, blemishes or the first signs of ageing?",
    ),
    ...hear(22000, "Hydration, mostly."),
    { at: 23400, apply: set({ activity: "thinking" }) },
    { at: 23500, apply: updateProfile({ concerns: ["sensitivity", "hydration"] }) },
    { at: 23800, apply: reply(2) },
    ...say(23800, "skincare", "Hydration it is. Which moisturiser do you use at the moment, and how do you find it?"),
    ...hear(27400, "A L'Oréal Paris day cream, I don't remember which one. I find it a bit too light, I love rich creams."),
    { at: 31800, apply: set({ activity: "thinking" }) },
    { at: 32000, apply: updateProfile({ texture_preference: "rich", product_feedback: [DAY_CREAM_FEEDBACK] }) },
    { at: 32300, apply: reply(3) },
    ...say(32300, "skincare", "So, something richer. Last question, only if you're happy to share: which decade are you in?"),
    ...hear(36400, "I'm in my thirties, and I'd like to stay around twenty five euros."),
    { at: 39400, apply: set({ activity: "thinking" }) },
    line(39900, "skincare", "Let me look through our range for you."),
    { at: 39900, apply: reply(4) },
    { at: 40700, apply: show("recommendation", [TOLERIANE, CERAVE_CREAM, CERAVE_SPF30], TOLERIANE.id) },
    { at: 40800, apply: updateProfile({ age_range: "30s", budget_band: "20_to_40" }) },
    ...say(
      41400,
      "skincare",
      "Since your day cream felt too light, my top pick is La Roche-Posay Toleriane Sensitive Rich Moisturiser. It reduces tightness, dryness and occasional redness while protecting your skin's barrier. Two alternatives are on screen. What do you think?",
    ),
    ...hear(48800, "The first one sounds perfect, I'll take it."),
    { at: 50800, apply: set({ activity: "thinking" }) },
    { at: 51200, apply: addToBasket(TOLERIANE) },
    { at: 51300, apply: updateProfile({ routine_size: "minimal", inferred: ["routine_size"] }) },
    { at: 51400, apply: show("routine", [CERAVE_CLEANSER], null) },
    { at: 51500, apply: reply(5) },
    ...say(
      51500,
      "skincare",
      "Lovely choice, it's in your selection. To complete your routine, the CeraVe Hydrating Cleanser cleanses without leaving skin tight or dry. Shall I add it?",
    ),
    ...hear(57800, "Yes please, add the cleanser."),
    { at: 59400, apply: set({ activity: "thinking" }) },
    { at: 59800, apply: addToBasket(CERAVE_CLEANSER) },
    { at: 59900, apply: reply(6) },
    { at: 60100, apply: showTutorials(TUTORIALS) },
    ...say(
      60300,
      "skincare",
      "Here's how to use your routine, with demos from La Roche-Posay and CeraVe: scan a QR code on screen to watch them on your phone. And your hair, how does it usually feel?",
    ),
    // The hair bridge (spec 002, Cross-sell): one question, the two Elvive products, then the save.
    ...hear(66600, "It's wavy, and quite dry at the ends."),
    { at: 68900, apply: set({ activity: "thinking" }) },
    { at: 69000, apply: updateProfile({ hair_type: "wavy", hair_concerns: ["dry_hair"] }) },
    line(69400, "skincare", "Let me look through our range for you."),
    { at: 69400, apply: reply(7) },
    { at: 70200, apply: show("recommendation", [ELVIVE_OIL, ELVIVE_SHAMPOO], ELVIVE_OIL.id) },
    ...say(
      70900,
      "skincare",
      "For your dry ends, L'Oréal Paris Elvive Extraordinary Oil leaves hair looking soft, shiny and weightless. The shampoo beside it goes with it. Would you like the oil in your selection?",
    ),
    ...hear(77000, "Yes, add the oil please."),
    { at: 78700, apply: set({ activity: "thinking" }) },
    { at: 79100, apply: addToBasket(ELVIVE_OIL) },
    { at: 79200, apply: reply(8) },
    ...say(79200, "skincare", "Lovely, it's in your selection. Would you like me to save your skin profile and routine for next time?"),
    ...hear(83800, "Yes, please save it. My name is Camille."),
    { at: 86000, apply: set({ activity: "thinking" }) },
    { at: 86400, apply: updateProfile({ first_name: "Camille", consent: "given" }) },
    { at: 86500, apply: reply(9) },
    ...say(
      86500,
      "skincare",
      "Thank you, Camille, your profile and routine are saved. To receive a recap with an in-store offer, type your email in the field on the screen.",
    ),
    { at: 92400, apply: set({ activity: "listening" }) },
  ];
}

/** What follows the address typed on screen (`submitEmail`), in ms after it is sent. */
function recapSteps(email: string): Step[] {
  const [local = "", domain = ""] = email.trim().toLowerCase().split("@");
  const emailMasked = `${local.charAt(0)}***@${domain}`; // as the backend masks it
  return [
    { at: 0, apply: set({ activity: "thinking" }) },
    { at: 900, apply: updateProfile({ email: emailMasked }) },
    { at: 900, apply: showRecap({ ...RECAP, emailMasked }) },
    { at: 900, apply: set({ costEur: RECAP_COST_EUR }) },
    line(
      1000,
      "skincare",
      "Thank you. Your recap and your in-store offer are on screen. If you have questions about any of our products, don't hesitate to ask our other specialists, and do come and try them in store.",
    ),
    { at: 9500, apply: set({ activity: "listening" }) },
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

  // Stop: the script and the recap stop where they are, and the screen keeps what they showed.
  const stop = useCallback(async () => {
    clear();
    setState((s) => (s.status === "live" ? { ...s, status: "ended", activity: "idle", transcript: settled(s.transcript) } : s));
  }, []);

  const end = useCallback(async () => {
    clear();
    setState(INITIAL);
  }, []);

  const setMode = useCallback((mode: MicMode) => setState((s) => ({ ...s, mode })), []);
  const pttDown = useCallback(() => setState((s) => ({ ...s, activity: "listening" })), []);
  const pttUp = useCallback(() => setState((s) => ({ ...s, activity: "thinking" })), []);

  const submitEmail = useCallback(async (email: string): Promise<EmailResult> => {
    if (!looksLikeEmail(email)) return { ok: false, error: "invalid_email" };
    for (const step of recapSteps(email)) {
      timers.current.push(window.setTimeout(() => setState(step.apply), step.at));
    }
    return { ok: true };
  }, []);

  return { ...state, start, stop, end, setMode, pttDown, pttUp, submitEmail };
}
