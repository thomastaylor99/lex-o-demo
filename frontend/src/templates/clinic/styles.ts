/** Clinic: the dermatology counter. White, cool grey surfaces, rounded cards, one calm blue. */

export const TEXT = "#0F172A";
export const MUTED = "#64748B";
export const FAINT = "#94A3B8";
export const SURFACE = "#F4F6F8";
export const LINE = "#E2E8F0";
export const BLUE = "#1660C8";
export const BLUE_TINT = "#E8F0FC";

export const DISPLAY = "var(--font-clinic-display), Georgia, serif";
export const BODY = "var(--font-clinic-body), system-ui, sans-serif";

export const CARD_SHADOW = "0 1px 2px rgba(15, 23, 42, 0.06), 0 10px 28px rgba(15, 23, 42, 0.06)";

export const CLINIC_CSS = `
@keyframes cl-pop { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: none; } }
@keyframes cl-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes cl-caret { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
@keyframes cl-ring { 0% { transform: scale(0.7); opacity: 0.8; } 100% { transform: scale(2.2); opacity: 0; } }
@keyframes cl-breathe { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }
@keyframes cl-dots { 0%, 80%, 100% { opacity: 0.25; } 40% { opacity: 1; } }
.cl-pop { animation: cl-pop 480ms cubic-bezier(0.2, 0.7, 0.1, 1) both; }
.cl-fade { animation: cl-fade 400ms ease-out both; }
.cl-caret::after { content: ""; display: inline-block; width: 2px; height: 0.9em; margin-left: 3px; vertical-align: -0.1em; background: currentColor; animation: cl-caret 1s steps(1) infinite; }
.cl-scroll { scrollbar-width: none; }
.cl-scroll::-webkit-scrollbar { display: none; }
@media (prefers-reduced-motion: reduce) { .cl-pop, .cl-fade { animation: none; } }
`;
