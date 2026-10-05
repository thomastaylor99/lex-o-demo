import type { Language } from "@/lib/events";

/** Eclipse's own words. The shared labels (Begin, the privacy note, the advisor) come from i18n. */
export interface EclipseCopy {
  /** Two lines, revealed word by word; the second is set in italic. */
  headline: readonly [string, string];
  sub: string;
  builtWith: string;
  expedition: string;
}

export const COPY: Record<Language, EclipseCopy> = {
  en: {
    headline: ["Your beauty,", "in your words."],
    sub: "A conversation about what suits you.",
    builtWith: "Built with Mistral AI",
    expedition: "for the L’Oréal Learning Expedition",
  },
  fr: {
    headline: ["Votre beauté,", "de vive voix."],
    sub: "Une conversation autour de ce qui vous va.",
    builtWith: "Conçu avec Mistral AI",
    expedition: "pour la Learning Expedition de L’Oréal",
  },
};
