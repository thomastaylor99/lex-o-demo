import { EASE } from "@/skins/frost/theme";

/** A deeper yellow for the thin bars: the brand yellow alone fades into white. */
export const GOLD = "#F4BC12";
/** The visitor's voice: a soft grey, between the hairline and the muted text. */
export const SOFT_GREY = "#B9BEC5";

/** The handover sweep's timing; the reveal of the new voice uses the same, so both move together. */
const SWEEP = `1300ms cubic-bezier(0.55, 0, 0.3, 1) both`;

/** Voice line keyframes and classes. Every name starts with vl-. */
export const VOICE_LINE_CSS = `
@keyframes vl-speak { from { transform: scaleY(calc(var(--amp) * 0.35)); } to { transform: scaleY(var(--amp)); } }
@keyframes vl-flow { 0%, 100% { transform: scaleY(0.4); } 50% { transform: scaleY(1); } }
@keyframes vl-string { from { transform: scaleY(1); } to { transform: scaleY(-1); } }
@keyframes vl-glow { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
@keyframes vl-shimmer { 0% { transform: translateX(-60%); } 82%, 100% { transform: translateX(340%); } }
@keyframes vl-sweep { 0% { transform: translateX(-100%); opacity: 1; } 76% { transform: translateX(0); opacity: 1; } 100% { transform: translateX(0); opacity: 0; } }
@keyframes vl-reveal { 0% { clip-path: inset(-24px 100% -24px 0); } 76%, 100% { clip-path: inset(-24px 0 -24px 0); } }
@keyframes vl-ring { 0% { box-shadow: 0 0 0 0 rgba(255, 210, 63, 0.8); } 100% { box-shadow: 0 0 0 11px rgba(255, 210, 63, 0); } }
@keyframes vl-relay { 0% { opacity: 0; transform: translateX(-6px); } 12%, 82% { opacity: 1; transform: none; } 100% { opacity: 0; transform: none; } }
@keyframes vl-after { 0%, 84% { opacity: 0; } 100% { opacity: 1; } }
@keyframes vl-fade { from { opacity: 0; } to { opacity: 1; } }

.vl-bar {
  flex: 0 0 2px; height: 26px; border-radius: 2px; background: ${GOLD}; transform: scaleY(0.04);
  animation: vl-speak var(--dur) ease-in-out var(--delay) infinite alternate, vl-flow 2600ms ease-in-out var(--flow) infinite;
  animation-composition: replace, add;
}
.vl-glow { animation: vl-glow 2600ms ease-in-out infinite; }
.vl-string { transform-box: view-box; transform-origin: 0 0; animation: vl-string 1900ms ease-in-out infinite alternate; }
.vl-bars[data-on="false"] .vl-bar, .vl-bars[data-on="false"] .vl-glow, .vl-swell[data-on="false"] .vl-string { animation-play-state: paused; }

.vl-shimmer { animation: vl-shimmer 1500ms cubic-bezier(0.35, 0, 0.4, 1) infinite; }
.vl-sweep { animation: vl-sweep ${SWEEP}; }
.vl-reveal { animation: vl-reveal ${SWEEP}; }
.vl-ring { animation: vl-ring 1100ms ease-out 2 both; }
.vl-relay { animation: vl-relay 3400ms ${EASE} both; }
.vl-after { animation: vl-after 3400ms ease both; }
.vl-fade { animation: vl-fade 320ms ease both; }

@media (prefers-reduced-motion: reduce) {
  .vl-bar { animation: none !important; transform: scaleY(var(--amp)); }
  .vl-glow, .vl-string, .vl-shimmer, .vl-sweep, .vl-reveal, .vl-ring, .vl-relay, .vl-after { animation: none !important; }
}
`;
