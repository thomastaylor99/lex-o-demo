/** Cover: a rich black field, one warm gold, white Didone type. */

export const FIELD = "#0B0A09";
export const TEXT = "#F7F4EF";
export const MUTED = "rgba(247, 244, 239, 0.66)";
export const QUIET = "rgba(247, 244, 239, 0.44)";
export const GOLD = "#DDAE62";
export const GOLD_LIGHT = "#F4D9A2";
export const GOLD_DEEP = "#A8762F";
export const ALERT = "#F2B09A";

export const DISPLAY = "var(--font-cover-display), 'Bodoni Moda', Didot, serif";
export const BODY = "var(--font-cover-body), system-ui, sans-serif";

/** The gold of the disc and the Begin button: lit from the upper left. */
export const GOLD_FILL = `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 48%, ${GOLD_DEEP} 100%)`;

export const EASE = "cubic-bezier(0.2, 0.7, 0.1, 1)";

/**
 * A length on the 1920 by 1080 artboard. The stage scales it to fit its container, so the cover
 * keeps its composition at 1440 by 900 and at any other size.
 */
export const u = (px: number): string => `calc(var(--co-u) * ${px})`;
