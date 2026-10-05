import type { Language } from "@/lib/events";

/** Reads the review query of a welcome mockup page: `lang` and `state`. Runs on the server. */
export function previewQuery(query: { lang?: string | string[]; state?: string | string[] }) {
  const language: Language = query.lang === "fr" ? "fr" : "en";
  const state = query.state === "starting" || query.state === "error" ? query.state : "idle";
  return { language, state } as const;
}
