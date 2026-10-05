import type { Language } from "@/lib/events";

import { gold } from "../theme";

/** The event line the Eclipse variations add to the header. */
export const KICKER: Record<Language, string> = {
  en: "Learning Expedition, October 2026",
  fr: "Learning Expedition, octobre 2026",
};

/** Cuts a square box down to a band of the given width along its circular edge. */
export const rim = (width: number): string =>
  `radial-gradient(farthest-side, transparent calc(100% - ${width}px), #000 calc(100% - ${width - 1}px), #000 calc(100% - 1px), transparent 100%)`;

export const FILL = { position: "absolute", inset: 0, borderRadius: "50%" } as const;

/** A band of light that crosses a button now and then. */
export const SHEEN = "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.45), transparent)";

/** Molten gold: warm and pale golds alternating around the ring, turned slowly for the shimmer. */
export const METAL =
  "conic-gradient(from 0deg, #6E4E1E, #F6DE9C 12%, #B98A3E 22%, #FFF4D2 31%, #9C7230 42%, #E9C77C 55%, #5E421A 66%, #F3D891 78%, #A87C36 88%, #6E4E1E)";

/** The variations' extra motion. Every name starts with ec-. */
export const VARIANTS_CSS = `
@keyframes ec-rise-in { from { opacity: 0; transform: translate(-50%, 8%); } to { opacity: 1; transform: translate(-50%, 0); } }
.ec-liquid { animation: ec-spin 26s linear infinite; }
[data-ec="starting"] .ec-liquid { animation-duration: 4s; }
.ec-horizon { animation: ec-rise-in 2600ms cubic-bezier(0.2, 0.7, 0.1, 1) both; }
@media (prefers-reduced-motion: reduce) { .ec-liquid, .ec-horizon { animation: none !important; } }
`;

/** The warm light behind the hero product. */
export const BACKLIGHT = `radial-gradient(closest-side, ${gold(0.32)}, ${gold(0.1)} 55%, transparent 100%)`;
