import { EASE } from "@/skins/frost/theme";

/** How long a handover holds the dock's presence slot, in ms. The vd-hand, vd-leave, vd-arrive, vd-relay and vd-settle classes share it. */
export const HANDOVER_MS = 2600;

/**
 * The dock's keyframes, injected after FROST_CSS. Every name starts with vd-. A handover plays once
 * because its elements mount keyed on the new agent: the concierge steps back then slides out to the
 * left, the expert slides in over it and lands where the presence avatar sits, the relay text shows
 * in between and follows the expert home, and the presence fades back in under the landed avatar.
 */
export const VOICE_DOCK_CSS = `
@keyframes vd-swap { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes vd-hand { 0%, 96% { opacity: 1; } 100% { opacity: 0; visibility: hidden; } }
@keyframes vd-leave {
  0% { opacity: 1; transform: none; }
  22%, 68% { opacity: 0.5; transform: scale(0.82); }
  88%, 100% { opacity: 0; transform: translateX(-84px) scale(0.82); }
}
@keyframes vd-arrive {
  0%, 4% { opacity: 0; transform: translateX(110px) scale(0.7); }
  24%, 68% { opacity: 1; transform: translateX(44px); }
  88%, 100% { opacity: 1; transform: none; }
}
@keyframes vd-relay {
  0%, 10% { opacity: 0; transform: translateX(12px); }
  24%, 68% { opacity: 1; transform: none; }
  84%, 100% { opacity: 0; transform: translateX(-36px); }
}
@keyframes vd-settle { 0%, 90% { opacity: 0; } 100% { opacity: 1; } }

.vd-swap { animation: vd-swap 320ms ${EASE} both; }
.vd-hand { animation: vd-hand ${HANDOVER_MS}ms linear both; }
.vd-leave { animation: vd-leave ${HANDOVER_MS}ms ${EASE} both; }
.vd-arrive { animation: vd-arrive ${HANDOVER_MS}ms ${EASE} both; }
.vd-relay { animation: vd-relay ${HANDOVER_MS}ms ease both; }
.vd-settle { animation: vd-settle ${HANDOVER_MS}ms linear both; }

@media (prefers-reduced-motion: reduce) {
  .vd-swap, .vd-settle { animation: none; }
  .vd-hand { display: none; }
}
`;
