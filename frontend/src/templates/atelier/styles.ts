/** Atelier: pure white editorial, black ink, one red accent kept for the live voice and the top pick. */

export const INK = "#0D0D0D";
export const GREY = "#6B6B6B";
export const LIGHT = "#E6E6E6";
export const WELL = "#F4F4F4";
export const RED = "#C8102E";

export const SERIF = "var(--font-atelier-serif), Georgia, serif";
export const SANS = "var(--font-atelier-sans), system-ui, sans-serif";

/** Keyframes for the template, injected once by the root component. */
export const ATELIER_CSS = `
@keyframes at-pop { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes at-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes at-caret { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
@keyframes at-pulse { 0% { transform: scale(0.8); opacity: 0.9; } 100% { transform: scale(2.4); opacity: 0; } }
@keyframes at-breathe { 0%, 100% { transform: scale(0.85); opacity: 0.55; } 50% { transform: scale(1.15); opacity: 1; } }
@keyframes at-spin { to { transform: rotate(360deg); } }
.at-pop { animation: at-pop 520ms cubic-bezier(0.2, 0.7, 0.1, 1) both; }
.at-fade { animation: at-fade 420ms ease-out both; }
.at-caret::after { content: ""; display: inline-block; width: 2px; height: 0.9em; margin-left: 4px; vertical-align: -0.1em; background: currentColor; animation: at-caret 1s steps(1) infinite; }
.at-scroll { scrollbar-width: none; }
.at-scroll::-webkit-scrollbar { display: none; }
@media (prefers-reduced-motion: reduce) { .at-pop, .at-fade { animation: none; } }
`;
