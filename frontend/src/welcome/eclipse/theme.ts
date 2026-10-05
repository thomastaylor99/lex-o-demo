/** Eclipse: cinematic night. A warm near-black, warm white type and one golden light for the voice. */

export const TEXT = "#F6EEE1";
export const TEXT_SOFT = "rgba(246, 238, 225, 0.7)";
export const TEXT_FAINT = "rgba(246, 238, 225, 0.5)";
export const CHAMPAGNE = "#EFD9A9";
export const GOLD = "#E2B865";
export const GOLD_LIGHT = "#FBE8BC";
export const ROSE = "#F2B49C";
/** Type on the gold pill. */
export const INK = "#1C1308";

/** The halo's gold at a given opacity. */
export const gold = (alpha: number): string => `rgba(226, 184, 101, ${alpha})`;

/** Never flat: the night is faintly warmer where the halo sits, and falls to black at the edges. */
export const BACKGROUND =
  "radial-gradient(ellipse 72% 74% at 50% 48%, #18120A 0%, #0D0A07 40%, #060505 70%, #020202 100%)";

export const DISPLAY = "var(--font-eclipse-display), 'Cormorant Garamond', Garamond, serif";
export const BODY = "var(--font-eclipse-body), 'Inter Tight', system-ui, sans-serif";

export const EASE = "cubic-bezier(0.2, 0.7, 0.1, 1)";

/** The eclipse's diameter at 1920×1080. */
export const RING = 700;

const round = (value: number): number => Math.round(value * 1000) / 1000;

/**
 * A length drawn at 1920×1080 that follows the screen: by height (so 1440×900 keeps the same
 * composition), and by width only on windows narrower than 16:10.
 */
export const u = (px: number): string => `min(${round(px / 10.8)}vh, ${round(px / 14.4)}vw)`;
