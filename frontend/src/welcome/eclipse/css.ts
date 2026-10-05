import { EASE, GOLD_LIGHT } from "./theme";

/**
 * Keyframes and the few rules inline styles cannot express. Every name starts with ec-. The root
 * carries data-ec="idle" or "starting": idle breathes slowly, starting shimmers faster.
 */
export const ECLIPSE_CSS = `
@keyframes ec-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes ec-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
@keyframes ec-word { from { opacity: 0; transform: translateY(0.2em); filter: blur(14px); } to { opacity: 1; transform: none; filter: blur(0); } }
@keyframes ec-ignite { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: none; } }
@keyframes ec-breathe { 0%, 100% { transform: scale(0.985); opacity: 0.7; } 50% { transform: scale(1.025); opacity: 1; } }
@keyframes ec-shimmer { 0%, 100% { transform: scale(0.995); opacity: 0.78; } 50% { transform: scale(1.05); opacity: 1; } }
@keyframes ec-spin { to { transform: rotate(360deg); } }
@keyframes ec-sheen { 0% { transform: translateX(-140%) skewX(-18deg); } 26%, 100% { transform: translateX(320%) skewX(-18deg); } }
@keyframes ec-pulse { 0%, 100% { opacity: 0.55; transform: scale(0.96); } 50% { opacity: 1; transform: scale(1.04); } }
@keyframes ec-blink { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
@keyframes ec-mote {
  0% { opacity: 0; transform: translate3d(0, 0, 0); }
  25%, 70% { opacity: var(--o); }
  100% { opacity: 0; transform: translate3d(var(--dx), var(--dy), 0); }
}

.ec-fade { animation: ec-fade 1400ms ease-out both; }
.ec-rise { animation: ec-rise 1100ms ${EASE} both; }
.ec-word { display: inline-block; animation: ec-word 1200ms ${EASE} both; }
.ec-ignite { animation: ec-ignite 2400ms ${EASE} both; }
.ec-breathe { animation: ec-breathe 6.5s ease-in-out infinite; }
.ec-orbit { animation: ec-spin 120s linear infinite; }
.ec-arc { animation: ec-spin 14s linear infinite; }
.ec-sheen { animation: ec-sheen 7s ${EASE} 2.6s infinite; }
.ec-pulse { animation: ec-pulse 3.2s ease-in-out infinite; }
.ec-mote { animation: ec-mote var(--dur) ease-in-out var(--delay) infinite; }

[data-ec="starting"] .ec-breathe { animation: ec-shimmer 1.2s ease-in-out infinite; }
[data-ec="starting"] .ec-orbit { animation-duration: 10s; }
[data-ec="starting"] .ec-arc { animation-duration: 1.5s; }
[data-ec="starting"] .ec-pulse { animation-duration: 1.1s; }
[data-ec="starting"] .ec-sheen { opacity: 0; }
[data-ec="starting"] .ec-label { animation: ec-blink 1.3s ease-in-out infinite; }

.ec-press { transition: transform 240ms ${EASE}, filter 240ms; }
.ec-press:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.06); }
.ec-press:active:not(:disabled) { transform: scale(0.98); }
.ec-press:focus-visible { outline: 2px solid ${GOLD_LIGHT}; outline-offset: 6px; }

@media (prefers-reduced-motion: reduce) {
  .ec-fade, .ec-rise, .ec-word, .ec-ignite, .ec-breathe, .ec-orbit, .ec-arc, .ec-sheen, .ec-pulse, .ec-label {
    animation: none !important;
  }
  .ec-mote { display: none; }
  .ec-press { transition: none; }
}
`;
