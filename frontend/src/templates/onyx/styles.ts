/** Onyx: pure black, golden yellow for the voice and live states, white type in three strengths. */

export const BG = "#070708";
export const PANEL = "#111113";
export const CARD = "#18181B";
export const BUBBLE = "#1C1C1F";
export const RAISED = "#141416";
export const YELLOW = "#FFC83D";
export const YELLOW_SOFT = "rgba(255, 200, 61, 0.14)";
export const YELLOW_GLOW = "rgba(255, 200, 61, 0.35)";
export const WHITE = "#FFFFFF";
export const WHITE_64 = "rgba(255, 255, 255, 0.64)";
export const WHITE_38 = "rgba(255, 255, 255, 0.38)";
export const WHITE_10 = "rgba(255, 255, 255, 0.10)";

export const FONT = "var(--font-onyx), system-ui, sans-serif";

export const ONYX_CSS = `
@keyframes ox-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
@keyframes ox-in { from { opacity: 0; transform: translateY(12px); filter: blur(8px); } to { opacity: 1; transform: none; filter: none; } }
@keyframes ox-out { from { opacity: 1; transform: none; filter: none; } to { opacity: 0; transform: translateY(-12px); filter: blur(8px); } }
@keyframes ox-caret { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
@keyframes ox-swell { 0%, 100% { transform: scale(1); } 25% { transform: scale(1.1); } 50% { transform: scale(0.97); } 75% { transform: scale(1.07); } }
@keyframes ox-breathe { 0%, 100% { transform: scale(0.97); } 50% { transform: scale(1.02); } }
@keyframes ox-glow { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
@keyframes ox-ripple { 0% { transform: scale(1); opacity: 0.75; } 100% { transform: scale(2.1); opacity: 0; } }
@keyframes ox-spin { to { transform: rotate(360deg); } }
@keyframes ox-pulse { 0% { transform: scale(1); } 35% { transform: scale(1.22); } 100% { transform: scale(1); } }
@keyframes ox-burst { 0% { transform: scale(1); opacity: 0.9; } 100% { transform: scale(3); opacity: 0; } }
@keyframes ox-lit { 0% { background-color: rgba(255, 200, 61, 0.24); } 100% { background-color: rgba(255, 200, 61, 0); } }
@keyframes ox-lit-text { 0%, 45% { color: #FFC83D; } 100% { color: #FFFFFF; } }
@keyframes ox-chip { 0% { opacity: 0; transform: scale(0.85); box-shadow: 0 0 0 0 rgba(255, 200, 61, 0.55); } 60% { opacity: 1; transform: scale(1.04); box-shadow: 0 0 0 18px rgba(255, 200, 61, 0); } 100% { opacity: 1; transform: none; box-shadow: 0 0 0 0 rgba(255, 200, 61, 0); } }
@keyframes ox-dot { 0%, 100% { opacity: 0.35; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1); } }
@keyframes ox-scan { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
.ox-rise { animation: ox-rise 520ms cubic-bezier(0.2, 0.7, 0.1, 1) both; }
.ox-in { animation: ox-in 700ms cubic-bezier(0.2, 0.7, 0.1, 1) both; }
.ox-out { animation: ox-out 520ms ease-in both; }
.ox-chip { animation: ox-chip 900ms cubic-bezier(0.2, 0.7, 0.1, 1) both; }
.ox-lit { animation: ox-lit 2000ms ease-out both; }
.ox-lit-text { animation: ox-lit-text 2000ms ease-out both; }
.ox-caret::after { content: ""; display: inline-block; width: 3px; height: 0.9em; margin-left: 5px; vertical-align: -0.1em; border-radius: 2px; background: #FFC83D; animation: ox-caret 1s steps(1) infinite; }
.ox-scroll { scrollbar-width: none; }
.ox-scroll::-webkit-scrollbar { display: none; }
.ox-btn { transition: background-color 200ms, color 200ms, transform 200ms, box-shadow 200ms; cursor: pointer; border: none; }
.ox-btn:hover { filter: brightness(1.12); }
@media (prefers-reduced-motion: reduce) { .ox-rise, .ox-in, .ox-chip, .ox-lit, .ox-lit-text { animation: none; } }
`;
