/** Duo: the visitor's side in white and cool grey, L'Oréal's side in near-black, one amber accent across both. */

export const FONT = "var(--font-duo), system-ui, sans-serif";

// Visitor side (light)
export const TEXT = "#0F172A";
export const BODY_TEXT = "#334155";
export const MUTED = "#64748B";
export const FAINT = "#94A3B8";
export const SURFACE = "#F4F6F8";
export const CARD_SHADOW = "0 1px 2px rgba(15, 23, 42, 0.05), 0 12px 32px rgba(15, 23, 42, 0.07)";

// Shared accent
export const AMBER = "#FF9A3C";
export const AMBER_DEEP = "#D97706";
export const AMBER_SOFT = "rgba(255, 154, 60, 0.16)";
export const ORB_FILL = "radial-gradient(circle at 34% 30%, #FFD6A8 0%, #FF9A3C 52%, #EE7A14 100%)";

// L'Oréal side (dark)
export const DARK = "#0E0F12";
export const DARK_CARD = "#17191E";
export const DARK_BORDER = "rgba(255, 255, 255, 0.08)";
export const ON_DARK = "#F3F4F6";
export const ON_DARK_MUTED = "rgba(243, 244, 246, 0.6)";
export const ON_DARK_FAINT = "rgba(243, 244, 246, 0.34)";

export const darkCard = {
  background: DARK_CARD,
  border: `1px solid ${DARK_BORDER}`,
  borderRadius: 22,
  padding: "20px 22px",
} as const;

export const DUO_CSS = `
@keyframes du-in { from { opacity: 0; transform: translateY(14px) scale(0.985); } to { opacity: 1; transform: none; } }
@keyframes du-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes du-caret { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
@keyframes du-ring { 0% { transform: scale(0.55); opacity: 0.75; } 100% { transform: scale(1.12); opacity: 0; } }
@keyframes du-breathe { 0%, 100% { transform: scale(0.94); } 50% { transform: scale(1.06); } }
@keyframes du-halo { 0%, 100% { opacity: 0.3; transform: scale(0.88); } 50% { opacity: 0.75; transform: scale(1.04); } }
@keyframes du-spin { to { transform: rotate(360deg); } }
@keyframes du-flash { 0% { opacity: 1; transform: scale(0.7); } 100% { opacity: 0; transform: scale(2.6); } }
@keyframes du-fill {
  0% { background-color: rgba(255, 154, 60, 0.3); box-shadow: 0 0 0 1px rgba(255, 154, 60, 0.55), 0 0 26px rgba(255, 154, 60, 0.32); }
  100% { background-color: rgba(255, 154, 60, 0); box-shadow: 0 0 0 1px rgba(255, 154, 60, 0), 0 0 0 rgba(255, 154, 60, 0); }
}
@keyframes du-scan { 0% { transform: translateY(-110%); } 100% { transform: translateY(260%); } }
@keyframes du-pill { 0% { opacity: 0; transform: scale(0.82); } 60% { opacity: 1; transform: scale(1.04); } 100% { opacity: 1; transform: none; } }
@keyframes du-dots { 0%, 80%, 100% { opacity: 0.2; } 40% { opacity: 1; } }
@keyframes du-dot { 0%, 100% { opacity: 0.45; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1.15); } }
.du-in { animation: du-in 520ms cubic-bezier(0.2, 0.7, 0.1, 1) both; }
.du-fade { animation: du-fade 420ms ease-out both; }
.du-fill { animation: du-fill 1800ms ease-out both; }
.du-caret::after { content: ""; display: inline-block; width: 3px; height: 0.95em; margin-left: 4px; vertical-align: -0.12em; border-radius: 2px; background: currentColor; animation: du-caret 1s steps(1) infinite; }
.du-caret-amber::after { background: ${AMBER}; }
.du-scroll { scrollbar-width: none; }
.du-scroll::-webkit-scrollbar { display: none; }
.du-button { transition: background-color 200ms, color 200ms, transform 200ms, box-shadow 200ms; cursor: pointer; }
.du-button:active { transform: scale(0.97); }
@media (prefers-reduced-motion: reduce) { .du-in, .du-fade, .du-fill { animation: none; } }
`;
