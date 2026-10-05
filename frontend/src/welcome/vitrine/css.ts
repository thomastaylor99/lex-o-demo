/** Vitrine's motion: entrances, breathing spotlights, a sweep of light while connecting. Names start with vi-. */
export const VITRINE_CSS = `
@keyframes vi-rise { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: none; } }
@keyframes vi-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes vi-spot { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
@keyframes vi-sweep { from { transform: translateX(-120%) skewX(-18deg); } to { transform: translateX(260%) skewX(-18deg); } }
@keyframes vi-dim { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
.vi-rise { animation: vi-rise 1000ms cubic-bezier(0.2, 0.7, 0.1, 1) both; }
.vi-fade { animation: vi-fade 1400ms ease-out both; }
.vi-press { transition: transform 200ms ease, box-shadow 200ms ease; }
.vi-press:hover { transform: translateY(-1px); box-shadow: 0 0 46px rgba(226, 184, 101, 0.45); }
.vi-press:active { transform: scale(0.98); }
@media (prefers-reduced-motion: reduce) {
  .vi-rise, .vi-fade { animation: none; }
  .vi-motion { animation: none !important; }
}
`;
