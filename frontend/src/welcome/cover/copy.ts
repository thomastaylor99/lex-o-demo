import type { Language } from "@/lib/events";

/** One cover line: an italic gold lead, then the rest in roman. */
export interface CoverLine {
  lead: string;
  rest: string;
}

export interface CoverCopy {
  /** The issue line above the masthead. */
  dateLine: string;
  /** The lead story, set on two lines: roman, then italic gold. */
  headline: [string, string];
  subLine: string;
  coverLines: CoverLine[];
  signature: string;
}

/** The cover's own words. Shared labels (Begin, the privacy note, Try again) come from i18n. */
const COPY: Record<Language, CoverCopy> = {
  en: {
    dateLine: "Learning Expedition, October 2026",
    headline: ["Beauty,", "spoken."],
    subLine: "Tell your advisor about your skin, and see what suits you.",
    coverLines: [
      { lead: "Three questions,", rest: "one routine" },
      { lead: "In English", rest: "and in French" },
    ],
    signature: "Built with Mistral AI for the L’Oréal Learning Expedition",
  },
  fr: {
    dateLine: "Learning Expedition, octobre 2026",
    headline: ["La beauté,", "de vive voix."],
    subLine: "Parlez de votre peau, et découvrez ce qui vous va.",
    coverLines: [
      { lead: "Trois questions,", rest: "une routine" },
      { lead: "En français", rest: "et en anglais" },
    ],
    signature: "Conçu avec Mistral AI pour la Learning Expedition de L’Oréal",
  },
};

export function coverCopy(language: Language): CoverCopy {
  return COPY[language];
}
