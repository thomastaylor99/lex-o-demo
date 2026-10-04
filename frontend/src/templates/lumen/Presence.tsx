import { labels } from "@/components/i18n";
import type { Language } from "@/lib/events";
import type { AgentActivity, AgentIdentity } from "@/lib/voice-agent";

import { AMBER, AMBER_SHADOW, DISPLAY, FAINT, LIFT_SHADOW, LINE, MUTED, SURFACE, TEXT, WHITE } from "./theme";
import { Waveform } from "./Waveform";

const EASE = "cubic-bezier(0.2, 0.7, 0.1, 1)";

/** Every agent sits in the same cell: the active one fades in while the previous one fades out. */
function Identity({ agents, activeIndex }: { agents: AgentIdentity[]; activeIndex: number }) {
  return (
    <div style={{ display: "grid" }}>
      {agents.map((agent, index) => {
        const on = index === activeIndex;
        return (
          <div
            key={agent.id}
            aria-hidden={!on}
            style={{
              gridArea: "1 / 1",
              opacity: on ? 1 : 0,
              transform: on ? "none" : `translateY(${index < activeIndex ? -16 : 16}px)`,
              filter: on ? "none" : "blur(6px)",
              transition: `opacity 700ms ${EASE}, transform 700ms ${EASE}, filter 700ms ${EASE}`,
            }}
          >
            <h2 style={{ fontFamily: DISPLAY, fontSize: 50, lineHeight: 1.04, color: TEXT, whiteSpace: "nowrap" }}>{agent.displayName}</h2>
            <p style={{ fontSize: 17, color: MUTED, marginTop: 4 }}>{agent.roleLabel}</p>
          </div>
        );
      })}
    </div>
  );
}

/** The voice: amber bars in a white capsule, which glows once when a new agent takes over. */
function Capsule({ activity, label, agentKey }: { activity: AgentActivity; label: string; agentKey: string }) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 18,
        background: WHITE,
        borderRadius: 999,
        padding: "12px 30px 12px 26px",
        boxShadow: activity === "speaking" ? AMBER_SHADOW : LIFT_SHADOW,
        transition: "box-shadow 500ms ease",
      }}
    >
      <span key={agentKey} className="lm-glow" style={{ position: "absolute", inset: 0, borderRadius: 999, pointerEvents: "none" }} />
      <Waveform mode={activity} />
      <span style={{ minWidth: 104, fontSize: 19, fontWeight: 600, color: TEXT }}>{label}</span>
    </div>
  );
}

/** The relay from concierge to specialist: done steps quiet, the active one filled amber. */
function Relay({ agents, activeIndex }: { agents: AgentIdentity[]; activeIndex: number }) {
  if (agents.length < 2) return null;
  return (
    <ol style={{ display: "flex", alignItems: "center", gap: 10 }} aria-label="Agents">
      {agents.map((agent, index) => {
        const active = index === activeIndex;
        const done = index < activeIndex;
        return (
          <li key={agent.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {index > 0 && (
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden fill="none" stroke={FAINT} strokeWidth="2.5" strokeLinecap="round">
                <path d="M9 5l7 7-7 7" />
              </svg>
            )}
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 999,
                padding: "8px 16px",
                fontSize: 16,
                fontWeight: active ? 700 : 500,
                background: active ? AMBER : done ? WHITE : SURFACE,
                color: active ? TEXT : done ? MUTED : FAINT,
                boxShadow: done ? `inset 0 0 0 1px ${LINE}` : "none",
                transition: "background 500ms ease, color 500ms ease",
              }}
            >
              {done && (
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden fill="none" stroke={AMBER} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              )}
              {agent.roleLabel}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** The active agent by role, its voice, and where the visitor is in the relay. */
export function Presence(props: { agents: AgentIdentity[]; activeAgent: AgentIdentity | null; activity: AgentActivity; language: Language }) {
  const { agents, activeAgent, activity, language } = props;
  const activeIndex = agents.findIndex((agent) => agent.id === activeAgent?.id);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 36, paddingBottom: 22 }}>
      <Identity agents={agents} activeIndex={activeIndex} />
      <Capsule activity={activity} label={labels(language).activity[activity]} agentKey={activeAgent?.id ?? "none"} />
      <div style={{ flex: 1 }} />
      <Relay agents={agents} activeIndex={activeIndex} />
    </div>
  );
}
