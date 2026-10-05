import type { CSSProperties } from "react";

import type { AgentIdentity } from "@/lib/voice-agent";
import { EASE, fs, ON_DARK_MUTED } from "@/skins/frost/theme";

import { AgentAvatar } from "../AgentAvatar";
import { HANDOVER_MS } from "./css";
import { HandoverRelay } from "./HandoverRelay";

/** After a handover, the new name fades in as the relay text, sliding home with the avatar, fades out. */
const NAME_DELAY_MS = Math.round(HANDOVER_MS * 0.78);

/**
 * One agent's name and role, stacked with the others: the active one fades in (after `delayMs`), the
 * others fade out fast, so the old name is gone before the next avatar slides over it.
 */
function nameLayer(on: boolean, delayMs: number): CSSProperties {
  const fade = on ? 420 : 180;
  return {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    whiteSpace: "nowrap",
    opacity: on ? 1 : 0,
    transform: on ? "none" : "translateY(8px)",
    transition: `opacity ${fade}ms ease ${delayMs}ms, transform 620ms ${EASE} ${delayMs}ms`,
  };
}

/**
 * Who speaks, at the dock's left end: the yellow avatar, the agent's name and its role, muted. The
 * name crossfades when the agent changes. `arrived` is the agent that just took over from the
 * concierge (else null): the relay plays first, then the avatar and the name settle in.
 */
export function DockPresence(props: {
  agents: AgentIdentity[];
  activeAgent: AgentIdentity | null;
  arrived: AgentIdentity | null;
  waiting: AgentIdentity;
}) {
  const { agents, activeAgent, arrived, waiting } = props;
  const current = activeAgent ?? waiting;
  const cast = [waiting, ...agents];

  return (
    <div
      style={{
        position: "relative",
        flex: "0 0 340px",
        alignSelf: "stretch",
        display: "flex",
        alignItems: "center",
        gap: 14,
        paddingLeft: 14,
        // The slot follows the dock's rounded end, so the concierge slides out under it.
        borderRadius: "42px 0 0 42px",
        overflow: "hidden",
      }}
    >
      <span key={`avatar-${current.id}`} className={arrived ? "vd-settle" : undefined} style={{ display: "flex" }}>
        <AgentAvatar agent={activeAgent} size={56} />
      </span>
      <span style={{ position: "relative", flex: 1, minWidth: 0, height: 56 }}>
        {cast.map((agent) => {
          const on = agent.id === current.id;
          return (
            <span key={agent.id || "waiting"} aria-hidden={!on} style={nameLayer(on, on && arrived ? NAME_DELAY_MS : 0)}>
              <span style={{ fontSize: fs(26), fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis" }}>
                {agent.displayName}
              </span>
              <span style={{ fontSize: fs(16), color: ON_DARK_MUTED, marginTop: 2 }}>{agent.roleLabel}</span>
            </span>
          );
        })}
      </span>
      {/* The concierge is the one who hands over, so the relay always starts from the first agent. */}
      {arrived && <HandoverRelay key={`relay-${arrived.id}`} from={agents[0]} to={arrived} />}
    </div>
  );
}
