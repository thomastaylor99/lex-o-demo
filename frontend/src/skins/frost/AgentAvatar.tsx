import type { ReactNode } from "react";

import type { AgentIdentity } from "@/lib/voice-agent";

import { DropIcon, SparkleIcon } from "./icons";
import { INK, YELLOW } from "./theme";

/** The icon by backend agent id; another agent shows its initial. */
function glyph(agent: AgentIdentity | null, size: number): ReactNode {
  const icon = Math.round(size * 0.46);
  if (!agent || agent.id === "concierge") return <SparkleIcon size={icon} />;
  if (agent.id === "skincare") return <DropIcon size={icon} />;
  return <span style={{ fontSize: Math.round(size * 0.45), fontWeight: 700 }}>{agent.displayName.charAt(0)}</span>;
}

/** The agent's mark: a yellow disc with its icon. */
export function AgentAvatar({ agent, size = 40 }: { agent: AgentIdentity | null; size?: number }) {
  return (
    <span
      aria-hidden
      style={{ flex: `0 0 ${size}px`, width: size, height: size, display: "grid", placeItems: "center", borderRadius: 999, background: YELLOW, color: INK }}
    >
      {glyph(agent, size)}
    </span>
  );
}
