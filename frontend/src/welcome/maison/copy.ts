import type { Language } from "@/lib/events";

/** Maison's words: a couture house's invitation. No promise about results. */
export const COPY: Record<Language, { kicker: string; line1: string; line2: string; sub: string; signature: string }> = {
  en: {
    kicker: "Learning Expedition, October 2026",
    line1: "Beauty,",
    line2: "in conversation.",
    sub: "Tell us about your skin. We listen, and suggest what suits you.",
    signature: "Built with Mistral AI for the L'Oréal Learning Expedition",
  },
  fr: {
    kicker: "Learning Expedition, octobre 2026",
    line1: "La beauté,",
    line2: "en conversation.",
    sub: "Parlez-nous de votre peau. Nous écoutons, et proposons ce qui vous va.",
    signature: "Conçu avec Mistral AI pour la Learning Expedition de L'Oréal",
  },
};
