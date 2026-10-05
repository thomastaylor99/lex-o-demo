import type { AgentIdentity } from "@/lib/voice-agent";
import { ChevronIcon } from "@/skins/frost/icons";
import { fs, INK, ON_DARK_MUTED } from "@/skins/frost/theme";

import { AgentAvatar } from "../AgentAvatar";

/** Where the presence avatar sits in the dock's presence slot; both avatars start or land there. */
const SPOT = { position: "absolute", left: 14, top: 14, display: "flex", borderRadius: 999 } as const;

/**
 * The handover inside the dock's presence slot, about 2.6 s: the concierge steps back and slides
 * out to the left, the expert slides in over it, and the relay reads "Welcome > Skincare". The dock
 * mounts it keyed on the new agent, so CSS plays it once per handover, without timers; it ends hidden.
 */
export function HandoverRelay({ from, to }: { from: AgentIdentity; to: AgentIdentity }) {
  return (
    <span aria-hidden className="vd-hand" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <span className="vd-leave" style={SPOT}>
        <AgentAvatar agent={from} size={56} />
      </span>
      {/* A ring the colour of the dock separates the two discs while they overlap. */}
      <span className="vd-arrive" style={{ ...SPOT, boxShadow: `0 0 0 4px ${INK}` }}>
        <AgentAvatar agent={to} size={56} />
      </span>
      <span
        className="vd-relay"
        style={{ position: "absolute", left: 128, top: 0, bottom: 0, display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", fontSize: fs(22) }}
      >
        <span style={{ color: ON_DARK_MUTED, fontWeight: 500 }}>{from.roleLabel}</span>
        <span style={{ display: "flex", color: ON_DARK_MUTED }}>
          <ChevronIcon size={16} />
        </span>
        <span style={{ fontWeight: 600 }}>{to.roleLabel}</span>
      </span>
    </span>
  );
}
