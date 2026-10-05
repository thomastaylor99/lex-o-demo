/** Maison's motion: slow entrances and one breathing line. Every name starts with ma-. */
export const MAISON_CSS = `
@keyframes ma-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes ma-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes ma-breathe { 0%, 100% { transform: scaleY(0.25); } 50% { transform: scaleY(1); } }
@keyframes ma-dim { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
.ma-rise { animation: ma-rise 1100ms cubic-bezier(0.2, 0.7, 0.1, 1) both; }
.ma-fade { animation: ma-fade 1400ms ease-out both; }
.ma-press { transition: transform 200ms ease, box-shadow 200ms ease; }
.ma-press:hover { transform: translateY(-1px); box-shadow: 0 18px 40px rgba(0, 0, 0, 0.16); }
.ma-press:active { transform: scale(0.98); }
@media (prefers-reduced-motion: reduce) {
  .ma-rise, .ma-fade { animation: none; }
  .ma-wave path { animation: none !important; }
}
`;
