import type { CSSProperties } from "react";

/** Ember: Studio's black and amber, calmer. Deep charcoal, frosted rounded panels, amber for what is live. */

export const AMBER = "#FF9A3C";
export const AMBER_SOFT = "rgba(255, 154, 60, 0.14)";
export const AMBER_LINE = "rgba(255, 154, 60, 0.45)";
export const ON_AMBER = "#1C1208";
export const TEXT = "#F3F4F6";
export const MUTED = "rgba(243, 244, 246, 0.65)";
export const FAINT = "rgba(243, 244, 246, 0.4)";
export const GLASS = "rgba(255, 255, 255, 0.05)";
export const GLASS_HI = "rgba(255, 255, 255, 0.09)";
export const EDGE = "rgba(255, 255, 255, 0.08)";
export const WELL = "#F7F7F8";
export const FONT = "var(--font-ember), system-ui, sans-serif";
export const BACKGROUND = "linear-gradient(155deg, #0E0F12 0%, #121318 45%, #17191E 100%)";

/** A frosted rounded surface. */
export function glass(radius = 28, background = GLASS): CSSProperties {
  return {
    background,
    border: `1px solid ${EDGE}`,
    borderRadius: radius,
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
  };
}

export const EMBER_CSS = `
@keyframes em-rise { from { opacity: 0; transform: translateY(16px) scale(0.985); } to { opacity: 1; transform: none; } }
@keyframes em-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes em-slide { from { opacity: 0; transform: translateX(-48px) scale(0.9); } to { opacity: 1; transform: none; } }
@keyframes em-caret { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
@keyframes em-dance { 0%, 100% { height: calc(var(--amp) * 22%); } 30% { height: calc(var(--amp) * 100%); } 60% { height: calc(var(--amp) * 46%); } 80% { height: calc(var(--amp) * 84%); } }
@keyframes em-breathe { 0%, 100% { height: 14%; opacity: 0.5; } 50% { height: calc(14% + var(--amp) * 30%); opacity: 0.95; } }
@keyframes em-sweep { 0%, 100% { height: 12%; opacity: 0.22; } 20% { height: 40%; opacity: 1; } 42% { height: 14%; opacity: 0.3; } }
@keyframes em-in { from { opacity: 0; filter: blur(10px); transform: translateY(12px); } to { opacity: 1; filter: blur(0); transform: none; } }
@keyframes em-out { from { opacity: 1; filter: blur(0); transform: none; } to { opacity: 0; filter: blur(10px); transform: translateY(-12px); } }
@keyframes em-flash { 0% { opacity: 0; } 15% { opacity: 1; } 100% { opacity: 0; } }
@keyframes em-glow { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.12); } }
@keyframes em-lit { 0% { background-color: rgba(255, 154, 60, 0.26); } 100% { background-color: rgba(255, 255, 255, 0.035); } }
@keyframes em-lit-text { 0%, 35% { color: ${AMBER}; } 100% { color: ${TEXT}; } }
@keyframes em-scan { 0% { transform: translateY(-110%); } 100% { transform: translateY(110%); } }
@keyframes em-pulse { 0%, 100% { opacity: 0.45; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1); } }
@keyframes em-dots { 0%, 80%, 100% { opacity: 0.25; } 40% { opacity: 1; } }
.em-rise { animation: em-rise 560ms cubic-bezier(0.2, 0.7, 0.1, 1) both; }
.em-fade { animation: em-fade 420ms ease-out both; }
.em-slide { animation: em-slide 700ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
.em-in { animation: em-in 700ms cubic-bezier(0.2, 0.7, 0.1, 1) both; }
.em-out { animation: em-out 520ms ease-in both; }
.em-caret::after { content: ""; display: inline-block; width: 3px; height: 0.95em; margin-left: 5px; vertical-align: -0.12em; border-radius: 2px; background: ${AMBER}; animation: em-caret 1s steps(1) infinite; }
.em-lit { animation: em-lit 2s ease-out; }
.em-lit .em-value { animation: em-lit-text 2s ease-out; }
.em-scroll { scrollbar-width: none; }
.em-scroll::-webkit-scrollbar { display: none; }
.em-press { transition: transform 160ms ease, background-color 200ms ease, color 200ms ease, box-shadow 200ms ease; }
.em-press:hover { filter: brightness(1.12); }
@media (prefers-reduced-motion: reduce) { .em-rise, .em-fade, .em-slide, .em-in { animation: none; } }
`;
