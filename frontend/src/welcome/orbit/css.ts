/** Orbit's motion: products drifting, a pearl that breathes, entrances. Every name starts with ob-. */
export const ORBIT_CSS = `
@keyframes ob-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes ob-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes ob-drift { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
@keyframes ob-breathe { 0%, 100% { transform: scale(0.94); opacity: 0.85; } 50% { transform: scale(1.04); opacity: 1; } }
@keyframes ob-ring { from { transform: scale(0.7); opacity: 0.55; } to { transform: scale(1.9); opacity: 0; } }
@keyframes ob-dim { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
@keyframes ob-spin { to { transform: rotate(360deg); } }
@keyframes ob-twinkle { 0%, 100% { opacity: 0.35; } 50% { opacity: 1; } }
@keyframes ob-travel { from { offset-distance: 0%; } to { offset-distance: 100%; } }
@keyframes ob-bloom { 0%, 100% { transform: translate(-50%, -50%) scale(0.94); opacity: 0.8; } 50% { transform: translate(-50%, -50%) scale(1.04); opacity: 1; } }
.ob-rise { animation: ob-rise 1000ms cubic-bezier(0.2, 0.7, 0.1, 1) both; }
.ob-fade { animation: ob-fade 1600ms ease-out both; }
.ob-press { transition: transform 200ms ease, box-shadow 200ms ease; }
.ob-press:hover { transform: translateY(-1px); box-shadow: 0 18px 40px rgba(11, 11, 12, 0.2); }
.ob-press:active { transform: scale(0.98); }
@media (prefers-reduced-motion: reduce) {
  .ob-rise, .ob-fade { animation: none; }
  .ob-motion { animation: none !important; }
}
`;
