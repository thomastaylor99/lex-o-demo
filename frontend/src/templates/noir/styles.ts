/** Noir: an evening boutique. Near-black, ivory type, one champagne light for the voice. */

export const IVORY = "#F2EEE8";
export const MUTED = "rgba(242, 238, 232, 0.58)";
export const FAINT = "rgba(242, 238, 232, 0.32)";
export const HAIRLINE = "rgba(242, 238, 232, 0.12)";
export const CHAMPAGNE = "#C9A96E";
export const CHAMPAGNE_LINE = "rgba(201, 169, 110, 0.35)";
export const PANEL = "#141416";
export const BACKGROUND = "radial-gradient(120% 90% at 30% 0%, #1A1A1D 0%, #0B0B0C 60%)";

export const DISPLAY = "var(--font-noir-display), Didot, serif";
export const BODY = "var(--font-noir-body), system-ui, sans-serif";

export const NOIR_CSS = `
@keyframes nr-pop { from { opacity: 0; transform: translateY(14px); filter: blur(6px); } to { opacity: 1; transform: none; filter: none; } }
@keyframes nr-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes nr-caret { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
@keyframes nr-speak { 0%, 100% { transform: scale(1); box-shadow: 0 0 28px 6px rgba(201, 169, 110, 0.38); } 50% { transform: scale(1.14); box-shadow: 0 0 60px 18px rgba(201, 169, 110, 0.55); } }
@keyframes nr-breathe { 0%, 100% { transform: scale(0.94); opacity: 0.7; } 50% { transform: scale(1); opacity: 1; } }
@keyframes nr-spin { to { transform: rotate(360deg); } }
.nr-pop { animation: nr-pop 640ms cubic-bezier(0.2, 0.7, 0.1, 1) both; }
.nr-fade { animation: nr-fade 500ms ease-out both; }
.nr-caret::after { content: ""; display: inline-block; width: 1.5px; height: 0.9em; margin-left: 4px; vertical-align: -0.1em; background: ${CHAMPAGNE}; animation: nr-caret 1s steps(1) infinite; }
.nr-scroll { scrollbar-width: none; }
.nr-scroll::-webkit-scrollbar { display: none; }
@media (prefers-reduced-motion: reduce) { .nr-pop, .nr-fade { animation: none; } }
`;
