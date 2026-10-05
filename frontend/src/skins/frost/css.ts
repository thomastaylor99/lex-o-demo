import { EASE } from "./theme";

/** Keyframes and the few classes inline styles cannot express. Every name starts with fr-. */
export const FROST_CSS = `
@keyframes fr-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
@keyframes fr-pop { 0% { opacity: 0; transform: scale(0.9); } 60% { opacity: 1; transform: scale(1.04); } 100% { opacity: 1; transform: none; } }
@keyframes fr-open { from { opacity: 0; transform: translateX(32px) scale(0.97); } to { opacity: 1; transform: none; } }
@keyframes fr-caret { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
@keyframes fr-speak { from { transform: scaleY(0.14); } to { transform: scaleY(var(--amp)); } }
@keyframes fr-listen { 0%, 100% { transform: scaleY(0.12); } 50% { transform: scaleY(calc(var(--amp) * 0.4)); } }
@keyframes fr-think { 0%, 100% { transform: scaleY(0.12); opacity: 0.35; } 50% { transform: scaleY(0.46); opacity: 1; } }
@keyframes fr-ring { 0% { box-shadow: 0 0 0 0 rgba(255, 210, 63, 0.8); } 100% { box-shadow: 0 0 0 30px rgba(255, 210, 63, 0); } }
@keyframes fr-flash { 0% { background-color: rgba(255, 210, 63, 0.42); } 100% { background-color: rgba(255, 210, 63, 0); } }
@keyframes fr-pulse { 0% { transform: scale(1); opacity: 0.7; } 100% { transform: scale(2.8); opacity: 0; } }
@keyframes fr-breathe { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
@keyframes fr-scan { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
@keyframes fr-fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
@keyframes fr-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes fr-swell { 0%, 100% { transform: scaleY(0.18); } 50% { transform: scaleY(calc(var(--amp) * 0.8)); } }

.fr-in { animation: fr-in 560ms ${EASE} both; }
.fr-fade { animation: fr-fade 360ms ${EASE} both; }
.fr-rise { animation: fr-rise 480ms ${EASE} both; }
.fr-pop { animation: fr-pop 520ms ${EASE} both; }
.fr-open { animation: fr-open 620ms ${EASE} both; }
.fr-ring { animation: fr-ring 1400ms ease-out 2 both; }
.fr-flash { animation: fr-flash 2200ms ease-out both; }
.fr-pulse { animation: fr-pulse 1800ms ease-out infinite; }
.fr-breathe { animation: fr-breathe 1600ms ease-in-out infinite; }
.fr-scan { animation: fr-scan 3600ms ease-in-out infinite; }
.fr-caret::after {
  content: ""; display: inline-block; width: 3px; height: 0.95em; margin-left: 4px;
  vertical-align: -0.12em; border-radius: 2px; background: currentColor;
  animation: fr-caret 1s steps(1) infinite;
}
.fr-scroll { scrollbar-width: none; }
.fr-scroll::-webkit-scrollbar { display: none; }

.fr-bar { flex: 0 0 5px; width: 5px; border-radius: 5px; transform: scaleY(0.12); transition: opacity 400ms; }
.fr-wave[data-mode="speaking"] .fr-bar { animation: fr-speak var(--dur) ease-in-out var(--delay) infinite alternate; }
.fr-wave[data-mode="listening"] .fr-bar { animation: fr-listen 2400ms ease-in-out var(--delay) infinite; }
.fr-wave[data-mode="thinking"] .fr-bar { animation: fr-think 1300ms ease-in-out calc(var(--i) * 40ms) infinite; }
.fr-wave[data-mode="idle"] .fr-bar { opacity: 0.35; }

.fr-lbar { flex: 0 0 3px; width: 3px; border-radius: 3px; transform: scaleY(0.16); transition: transform 400ms ${EASE}; }
.fr-lwave[data-mode="speaking"] .fr-lbar { animation: fr-speak var(--dur) ease-in-out var(--delay) infinite alternate; }
.fr-lwave[data-mode="listening"] .fr-lbar { animation: fr-swell 2200ms ease-in-out var(--delay) infinite; }
.fr-lwave[data-mode="thinking"] .fr-lbar { animation: fr-think 1300ms ease-in-out calc(var(--i) * 60ms) infinite; }

.fr-press { transition: transform 180ms ${EASE}, background-color 180ms, box-shadow 180ms; }
.fr-press:hover { transform: translateY(-1px); }
.fr-press:active { transform: scale(0.97); }

@media (prefers-reduced-motion: reduce) {
  .fr-in, .fr-fade, .fr-rise, .fr-pop, .fr-open, .fr-ring, .fr-flash, .fr-scan, .fr-pulse { animation: none; }
}
`;
