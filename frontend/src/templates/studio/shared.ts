import type { Labels } from "@/components/i18n";
import type { Language } from "@/lib/events";
import type { AgentActivity, VoiceAgent } from "@/lib/voice-agent";

export type DemoAgent = VoiceAgent & { replay: () => void };
export type WaveMode = AgentActivity;

/** Strings this template needs beyond the shared interface labels. */
export interface StudioCopy {
  live: string;
  connecting: string;
  ready: string;
  error: string;
  avg: string;
  p90: string;
  cost: string;
  replay: string;
  basket: string;
  customer: string;
  guest: string;
  consentPending: string;
  inBasket: string;
  transcribing: string;
  emptyTitle: string;
  emptyBody: string;
  basketEmpty: string;
  products: (count: number) => string;
  steps: (count: number) => string;
  items: (count: number) => string;
}

const EN: StudioCopy = {
  live: "Live",
  connecting: "Connecting",
  ready: "Ready",
  error: "Connection lost",
  avg: "Avg",
  p90: "p90",
  cost: "Cost",
  replay: "Replay",
  basket: "Basket",
  customer: "Customer",
  guest: "Guest",
  consentPending: "Consent pending",
  inBasket: "In basket",
  transcribing: "Transcribing",
  emptyTitle: "Say hello to begin",
  emptyBody: "The conversation appears here as you talk.",
  basketEmpty: "Products the advisor adds appear here.",
  products: (count) => (count === 1 ? "1 product" : `${count} products`),
  steps: (count) => (count === 1 ? "1 step" : `${count} steps`),
  items: (count) => (count === 1 ? "1 item" : `${count} items`),
};

const FR: StudioCopy = {
  live: "En direct",
  connecting: "Connexion",
  ready: "Prête",
  error: "Connexion perdue",
  avg: "Moy.",
  p90: "p90",
  cost: "Coût",
  replay: "Rejouer",
  basket: "Panier",
  customer: "Client",
  guest: "Invité",
  consentPending: "Accord en attente",
  inBasket: "Au panier",
  transcribing: "Transcription",
  emptyTitle: "Dites bonjour pour commencer",
  emptyBody: "La conversation s'affiche ici au fil de l'échange.",
  basketEmpty: "Les produits ajoutés par la conseillère apparaissent ici.",
  products: (count) => (count === 1 ? "1 produit" : `${count} produits`),
  steps: (count) => (count === 1 ? "1 étape" : `${count} étapes`),
  items: (count) => (count === 1 ? "1 article" : `${count} articles`),
};

export function studioCopy(language: Language): StudioCopy {
  return language === "fr" ? FR : EN;
}

export interface PartProps {
  agent: DemoAgent;
  l: Labels;
  c: StudioCopy;
}

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** One letter for a round avatar. */
export function initial(name: string): string {
  return name.trim().charAt(0).toLocaleUpperCase();
}

export function waveModeFor(status: VoiceAgent["status"], activity: AgentActivity): WaveMode {
  if (status === "starting") return "thinking";
  if (status !== "live") return "idle";
  return activity;
}

function locale(language: Language): string {
  return language === "fr" ? "fr-FR" : "en-GB";
}

/** Reply times with two decimals: "0.58 s". */
export function formatStatSeconds(ms: number, language: Language): string {
  const seconds = new Intl.NumberFormat(locale(language), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(ms / 1000);
  return `${seconds} s`;
}

/** Conversation cost with three decimals: "€0.031". */
export function formatCost(eur: number, language: Language): string {
  return new Intl.NumberFormat(locale(language), {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(eur);
}

/** A catalogue claim shown as a quotation from the brand page. */
export function quoteClaim(text: string, language: Language): string {
  return language === "fr" ? `« ${text} »` : `“${text}”`;
}
