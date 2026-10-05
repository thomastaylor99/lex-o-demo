import { EASE } from "@/skins/frost/theme";

/** The relay opens inside the pill after a handover, holds, then folds away. */
export const HP_CSS = `
@keyframes hp-crumb {
  0% { max-width: 0; opacity: 0; }
  14% { max-width: 280px; opacity: 1; }
  82% { max-width: 280px; opacity: 1; }
  100% { max-width: 0; opacity: 0; }
}
.hp-crumb { animation: hp-crumb 3600ms ${EASE} both; overflow: hidden; white-space: nowrap; }

@media (prefers-reduced-motion: reduce) {
  .hp-crumb { animation: none; max-width: 0; opacity: 0; }
}
`;
