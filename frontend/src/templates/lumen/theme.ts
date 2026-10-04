/** Lumen: Clinic's white counter with amber as the single accent. */

export const WHITE = "#FFFFFF";
export const TEXT = "#0F172A";
export const INK_SOFT = "#334155";
export const MUTED = "#64748B";
export const FAINT = "#94A3B8";
export const SURFACE = "#F4F6F8";
export const VISITOR = "#F1F3F5";
export const LINE = "#E2E8F0";
export const AMBER = "#F59E0B";
export const AMBER_DEEP = "#D97706";
export const AMBER_TINT = "#FEF3C7";

export const DISPLAY = "var(--font-lumen-display), Georgia, serif";
export const BODY = "var(--font-lumen-body), system-ui, sans-serif";

export const CARD_SHADOW = "0 1px 2px rgba(15, 23, 42, 0.05), 0 12px 32px rgba(15, 23, 42, 0.07)";
export const LIFT_SHADOW = "0 2px 6px rgba(15, 23, 42, 0.06), 0 18px 44px rgba(15, 23, 42, 0.09)";
export const AMBER_SHADOW = "0 2px 6px rgba(217, 119, 6, 0.12), 0 18px 44px rgba(245, 158, 11, 0.28)";

/** A white side-panel card. */
export const PANEL_CARD = { background: WHITE, borderRadius: 24, boxShadow: CARD_SHADOW, padding: "22px 24px" } as const;

export const productImage = (id: string) => `/products/${id}.png`;
