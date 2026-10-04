/** Keyframes and the few rules inline styles cannot express. Every keyframe and class starts with lm-. */
export const LUMEN_CSS = `
@keyframes lm-pop { from { opacity: 0; transform: translateY(14px) scale(0.98); } to { opacity: 1; transform: none; } }
@keyframes lm-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes lm-slide { from { opacity: 0; transform: translateX(32px); } to { opacity: 1; transform: none; } }
@keyframes lm-caret { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
@keyframes lm-speak {
  0%, 100% { transform: scaleY(calc(var(--amp) * 0.25)); }
  25% { transform: scaleY(var(--amp)); }
  50% { transform: scaleY(calc(var(--amp) * 0.5)); }
  75% { transform: scaleY(calc(var(--amp) * 0.85)); }
}
@keyframes lm-breathe {
  0%, 100% { transform: scaleY(0.14); opacity: 0.6; }
  50% { transform: scaleY(calc(0.18 + var(--amp) * 0.3)); opacity: 1; }
}
@keyframes lm-shimmer {
  0%, 100% { transform: scaleY(0.14); opacity: 0.3; }
  18% { transform: scaleY(0.55); opacity: 1; }
  40% { transform: scaleY(0.16); opacity: 0.4; }
}
@keyframes lm-glow { 0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.5); } 100% { box-shadow: 0 0 0 22px rgba(245, 158, 11, 0); } }
@keyframes lm-ring { 0% { transform: scale(0.8); opacity: 0.7; } 100% { transform: scale(2.4); opacity: 0; } }
@keyframes lm-pulse { 0%, 100% { opacity: 0.5; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1); } }
@keyframes lm-soft { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
@keyframes lm-flash { 0%, 30% { background-color: rgba(245, 158, 11, 0.22); } 100% { background-color: rgba(245, 158, 11, 0); } }
@keyframes lm-scan { from { transform: translateY(-100%); } to { transform: translateY(265%); } }
.lm-pop { animation: lm-pop 520ms cubic-bezier(0.2, 0.7, 0.1, 1) both; }
.lm-fade { animation: lm-fade 420ms ease-out both; }
.lm-slide { animation: lm-slide 560ms cubic-bezier(0.2, 0.7, 0.1, 1) both; }
.lm-flash { animation: lm-flash 2.6s ease-out both; }
.lm-glow { animation: lm-glow 1.4s ease-out 2; }
.lm-ring { animation: lm-ring 1.6s ease-out infinite; }
.lm-pulse { animation: lm-pulse 2.4s ease-in-out infinite; }
.lm-soft { animation: lm-soft 3.2s ease-in-out infinite; }
.lm-scanband { animation: lm-scan 3.8s ease-in-out infinite; }
.lm-handover { animation: lm-pop 520ms cubic-bezier(0.2, 0.7, 0.1, 1) both, lm-glow 1.4s ease-out 350ms 2; }
.lm-caret::after {
  content: ""; display: inline-block; width: 3px; height: 0.95em; margin-left: 5px; vertical-align: -0.12em;
  border-radius: 2px; background: #F59E0B; animation: lm-caret 1s steps(1) infinite;
}
.lm-scroll { scrollbar-width: none; }
.lm-scroll::-webkit-scrollbar { display: none; }
.lm-bar { transform: scaleY(0.12); transform-origin: 50% 50%; transition: opacity 300ms ease; }
.lm-wave[data-mode="idle"] .lm-bar { opacity: 0.35; }
.lm-wave[data-mode="speaking"] .lm-bar { animation: lm-speak var(--dur) ease-in-out var(--delay) infinite; }
.lm-wave[data-mode="listening"] .lm-bar { animation: lm-breathe 2.6s ease-in-out var(--edge) infinite; }
.lm-wave[data-mode="thinking"] .lm-bar { animation: lm-shimmer 1.4s ease-in-out var(--step) infinite; }
@media (prefers-reduced-motion: reduce) {
  .lm-pop, .lm-fade, .lm-slide, .lm-flash, .lm-glow, .lm-handover, .lm-scanband { animation: none; }
  .lm-wave .lm-bar { animation: none !important; transform: scaleY(0.4); }
}
`;
