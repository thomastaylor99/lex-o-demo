import { EASE } from "@/skins/frost/theme";

/**
 * Inline voice's own keyframes and classes, injected after FROST_CSS (whose fr-speak and fr-think
 * keyframes the small waves reuse). Every name starts with iv-.
 */
export const INLINE_VOICE_CSS = `
@keyframes iv-fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
@keyframes iv-text { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes iv-swell { 0%, 100% { transform: scaleY(0.18); } 50% { transform: scaleY(calc(var(--amp) * 0.8)); } }

.iv-fade { animation: iv-fade 360ms ${EASE} both; }
.iv-text { animation: iv-text 480ms ${EASE} both; }

.iv-bar { flex: 0 0 3px; width: 3px; border-radius: 3px; transform: scaleY(0.16); transition: transform 400ms ${EASE}; }
.iv-wave[data-mode="speaking"] .iv-bar { animation: fr-speak var(--dur) ease-in-out var(--delay) infinite alternate; }
.iv-wave[data-mode="listening"] .iv-bar { animation: iv-swell 2200ms ease-in-out var(--delay) infinite; }
.iv-wave[data-mode="thinking"] .iv-bar { animation: fr-think 1300ms ease-in-out calc(var(--i) * 60ms) infinite; }

@media (prefers-reduced-motion: reduce) {
  .iv-fade, .iv-text { animation: none; }
}
`;
