import { EASE, GOLD } from "./theme";

/** Keyframes and the few rules inline styles cannot express. Every name starts with co-. */
export const COVER_CSS = `
.co-root { container-type: size; }
.co-stage { --co-u: min(calc(100cqw / 1920), calc(100cqh / 1080)); }

@keyframes co-rise { from { opacity: 0; translate: 0 calc(var(--co-u) * 28); } to { opacity: 1; translate: 0 0; } }
@keyframes co-settle { from { opacity: 0; letter-spacing: 0.02em; } to { opacity: 1; letter-spacing: -0.035em; } }
@keyframes co-float { 0%, 100% { translate: 0 0; } 50% { translate: 0 calc(var(--co-u) * -9); } }
@keyframes co-sheen { to { rotate: 360deg; } }
@keyframes co-ripple { 0% { scale: 1; opacity: 0.6; } 100% { scale: 1.32; opacity: 0; } }
@keyframes co-breathe { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }

.co-rise { animation: co-rise 900ms ${EASE} both; }
.co-settle { animation: co-settle 1400ms ${EASE} both; }
.co-float { animation: co-float 7s ease-in-out infinite; }
.co-sheen { animation: co-sheen 26s linear infinite; }
.co-ripple { animation: co-ripple 2400ms ease-out infinite; }
.co-breathe { animation: co-breathe 1500ms ease-in-out infinite; }

.co-press { transition: translate 220ms ${EASE}, scale 160ms ${EASE}, box-shadow 220ms, filter 220ms; }
.co-press:hover:not(:disabled) { translate: 0 calc(var(--co-u) * -2); filter: brightness(1.05); }
.co-press:active:not(:disabled) { scale: 0.97; }
.co-press:focus-visible { outline: calc(var(--co-u) * 3) solid ${GOLD}; outline-offset: calc(var(--co-u) * 6); }

@media (prefers-reduced-motion: reduce) {
  .co-rise, .co-settle, .co-float, .co-sheen, .co-ripple, .co-breathe { animation: none; }
  .co-ripple { opacity: 0; }
  .co-press { transition: none; }
}
`;
