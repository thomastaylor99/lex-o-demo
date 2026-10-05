/** Frost: a white screen, cool grey surfaces, black solid elements and one yellow highlight. */

export const INK = "#0B0B0C";
export const TEXT_2 = "#2C2F34";
export const MUTED = "#6B7079";
export const QUIET = "#A3A8B0";
export const PARTIAL = "#7D828B";
export const ON_DARK_MUTED = "#9EA3AB";
export const SURFACE = "#F5F6F7";
export const BUBBLE = "#F1F2F4";
export const TRACK = "#E3E5E8";
export const YELLOW = "#FFD23F";

export const FONT = "var(--font-frost), system-ui, sans-serif";

/** The skin's type scale: the Frost template's sizes at 80%, never below 13 px. Use it for every font size. */
export const fs = (px: number): number => Math.max(13, Math.round(px * 0.8));

export const EASE = "cubic-bezier(0.2, 0.7, 0.1, 1)";
export const SPRING = "cubic-bezier(0.34, 1.32, 0.5, 1)";

export const CARD_SHADOW = "0 1px 2px rgba(11, 11, 12, 0.04), 0 10px 30px rgba(11, 11, 12, 0.05)";

/** Two lines of text at most, ending in an ellipsis. */
export const CLAMP_2 = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
} as const;

/** A packshot on white inside a relative well: it scales down and never overflows. */
export const PACKSHOT = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "contain",
} as const;
