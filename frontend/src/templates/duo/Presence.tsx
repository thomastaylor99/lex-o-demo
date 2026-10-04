import { labels } from "@/components/i18n";
import type { Language } from "@/lib/events";
import type { AgentActivity, AgentIdentity } from "@/lib/voice-agent";

import { Orb } from "./Orb";
import { AMBER, AMBER_DEEP, MUTED, SURFACE, TEXT } from "./styles";

function ActivityPill({ activity, language }: { activity: AgentActivity; language: Language }) {
  const live = activity !== "idle";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, background: SURFACE, borderRadius: 999, padding: "10px 20px", fontSize: 18, fontWeight: 700, color: live ? TEXT : MUTED }}>
      <span style={{ width: 10, height: 10, borderRadius: 999, background: live ? AMBER : "#CBD5E1", animation: live ? "du-dot 1.6s ease-in-out infinite" : undefined }} />
      {labels(language).activity[activity]}
      {activity === "thinking" && (
        <span aria-hidden style={{ color: AMBER_DEEP, marginLeft: -6 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ animation: `du-dots 1.2s ${i * 0.2}s infinite` }}>.</span>
          ))}
        </span>
      )}
    </span>
  );
}

/**
 * The active agent: the orb, then its role and name. Every agent is stacked in the same cell, so a
 * handover crossfades the old role out and the new one in, while the orb flashes once.
 */
export function Presence({
  agents,
  activeAgent,
  activity,
  language,
}: {
  agents: AgentIdentity[];
  activeAgent: AgentIdentity | null;
  activity: AgentActivity;
  language: Language;
}) {
  const activeId = activeAgent?.id ?? agents[0]?.id ?? null;
  const activeIndex = agents.findIndex((agent) => agent.id === activeId);
  const handedOver = activeIndex > 0;

  return (
    <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 22, padding: "4px 48px 18px 36px" }}>
      <Orb activity={activity} flashKey={handedOver ? activeId : null} />
      <div style={{ display: "grid", flex: 1, minWidth: 0 }}>
        {agents.map((agent, index) => {
          const on = index === activeIndex;
          const shift = on ? "none" : index < activeIndex ? "translateY(-14px)" : "translateY(14px)";
          return (
            <div
              key={agent.id}
              aria-hidden={!on}
              style={{
                gridArea: "1 / 1",
                opacity: on ? (activeAgent ? 1 : 0.4) : 0,
                transform: shift,
                filter: on ? "none" : "blur(6px)",
                transition: "opacity 700ms ease, transform 700ms cubic-bezier(0.2, 0.7, 0.1, 1), filter 700ms ease",
              }}
            >
              <p style={{ fontSize: 18, fontWeight: 700, color: AMBER_DEEP }}>{agent.roleLabel}</p>
              <h2 style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.12, letterSpacing: "-0.02em", color: TEXT }}>{agent.displayName}</h2>
            </div>
          );
        })}
      </div>
      <ActivityPill activity={activity} language={language} />
    </div>
  );
}
