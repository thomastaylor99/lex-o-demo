import { EASE } from "@/skins/frost/theme";

/** The handover opens a segment inside the island, holds it, then folds it away. Thinking dots pulse in turn. */
export const BI_CSS = `
@keyframes bi-handover {
  0% { max-width: 0; opacity: 0; }
  12% { max-width: 360px; opacity: 1; }
  80% { max-width: 360px; opacity: 1; }
  100% { max-width: 0; opacity: 0; }
}
@keyframes bi-dot { 0%, 100% { opacity: 0.2; transform: scale(0.8); } 50% { opacity: 1; transform: none; } }

.bi-handover { animation: bi-handover 3400ms ${EASE} both; overflow: hidden; }
.bi-dot { animation: bi-dot 1100ms ease-in-out infinite both; }

@media (prefers-reduced-motion: reduce) {
  .bi-handover { animation: none; max-width: 0; opacity: 0; }
  .bi-dot { animation: none; opacity: 0.6; }
}
`;
