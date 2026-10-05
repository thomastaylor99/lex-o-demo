import type { Language } from "@/lib/events";

/** Orbit's words: beauty that listens. No promise about results. */
export const COPY: Record<Language, { kicker: string; line1: string; line2: string; sub: string; signature: string }> = {
  en: {
    kicker: "Learning Expedition, October 2026",
    line1: "Beauty",
    line2: "that listens.",
    sub: "Speak freely: our advisor asks a few questions, then suggests what suits you.",
    signature: "Built with Mistral AI for the L'Oréal Learning Expedition",
  },
  fr: {
    kicker: "Learning Expedition, octobre 2026",
    line1: "La beauté",
    line2: "qui vous écoute.",
    sub: "Parlez librement : notre conseillère pose quelques questions, puis propose ce qui vous va.",
    signature: "Conçu avec Mistral AI pour la Learning Expedition de L'Oréal",
  },
};

/** The products around the voice: angle on the ellipse (degrees), height (px), tilt (degrees). */
export const PRODUCTS: { id: string; angle: number; height: number; tilt: number }[] = [
  { id: "lrp-toleriane-sensitive-riche", angle: 200, height: 190, tilt: -6 },
  { id: "cerave-moisturising-cream", angle: 158, height: 150, tilt: 4 },
  { id: "lop-revitalift-clinical-vitc-serum", angle: 236, height: 160, tilt: 5 },
  { id: "cerave-hydrating-cleanser", angle: 124, height: 176, tilt: -4 },
  { id: "lrp-anthelios-uvmune400-ff", angle: 340, height: 180, tilt: 6 },
  { id: "lop-revitalift-filler-gel-cream", angle: 22, height: 140, tilt: -5 },
  { id: "cerave-spf30-moisturiser", angle: 304, height: 150, tilt: -3 },
  { id: "lop-elseve-extraordinary-oil", angle: 56, height: 170, tilt: 4 },
];
