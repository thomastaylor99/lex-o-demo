import type { AgentIdentity } from "@/lib/voice-agent";

import { ChevronIcon } from "./icons";
import { BUBBLE, EASE, INK, MUTED, QUIET, YELLOW, fs } from "./theme";

const MOVE = `400ms ${EASE}`;

/**
 * The relay from concierge to specialist, by role ("Welcome > Skincare"), beside the capsule: the
 * active step is a black pill with a yellow dot, the others light grey. Hidden with a single agent.
 */
export function Relay({ agents, activeAgent }: { agents: AgentIdentity[]; activeAgent: AgentIdentity | null }) {
  if (agents.length < 2) return null;

  return (
    <ol aria-label="Agents" style={{ flex: "none", display: "flex", alignItems: "center", gap: 6, margin: 0, padding: 0, listStyle: "none" }}>
      {agents.map((agent, index) => {
        const on = agent.id === activeAgent?.id;
        return (
          <li key={agent.id} aria-current={on ? "step" : undefined} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {index > 0 && (
              <span aria-hidden style={{ display: "flex", color: QUIET }}>
                <ChevronIcon size={14} />
              </span>
            )}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                borderRadius: 999,
                padding: "7px 14px",
                background: on ? INK : BUBBLE,
                color: on ? "#fff" : MUTED,
                fontSize: fs(16),
                fontWeight: on ? 600 : 500,
                whiteSpace: "nowrap",
                transition: `background-color ${MOVE}, color ${MOVE}`,
              }}
            >
              {/* The dot grows in rather than popping, so the pill widens smoothly at the handover. */}
              <span
                aria-hidden
                style={{
                  flex: "none",
                  width: on ? 7 : 0,
                  height: 7,
                  marginRight: on ? 7 : 0,
                  borderRadius: 999,
                  background: YELLOW,
                  opacity: on ? 1 : 0,
                  transition: `width ${MOVE}, margin-right ${MOVE}, opacity ${MOVE}`,
                }}
              />
              {agent.roleLabel}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
