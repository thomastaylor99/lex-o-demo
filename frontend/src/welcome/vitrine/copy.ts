import type { Language } from "@/lib/events";

/** Vitrine's words: a boutique window that answers when you speak. No promise about results. */
export const COPY: Record<Language, { kicker: string; line1: string; line2: string; sub: string; signature: string }> = {
  en: {
    kicker: "Learning Expedition, October 2026",
    line1: "Ask,",
    line2: "and the window answers.",
    sub: "Tell our advisor about your skin, and the right products step into the light.",
    signature: "Built with Mistral AI for the L'Oréal Learning Expedition",
  },
  fr: {
    kicker: "Learning Expedition, octobre 2026",
    line1: "Demandez,",
    line2: "la vitrine vous répond.",
    sub: "Parlez de votre peau à notre conseillère, et les bons produits entrent dans la lumière.",
    signature: "Conçu avec Mistral AI pour la Learning Expedition de L'Oréal",
  },
};

/** The six products in the window, left to right. */
export const WINDOW = [
  "cerave-hydrating-cleanser",
  "lop-revitalift-clinical-vitc-serum",
  "lrp-toleriane-sensitive-riche",
  "cerave-moisturising-cream",
  "lrp-anthelios-uvmune400-ff",
  "lop-elseve-extraordinary-oil",
];
