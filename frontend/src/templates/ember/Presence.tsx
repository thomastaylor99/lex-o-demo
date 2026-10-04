import { labels } from "@/components/i18n";
import type { Language } from "@/lib/events";
import type { AgentActivity, AgentIdentity, VoiceAgent } from "@/lib/voice-agent";

import { AMBER, AMBER_SOFT, EDGE, FAINT, MUTED, TEXT, glass } from "./theme";
import { Waveform } from "./Waveform";

const GLOW: Record<AgentActivity, number> = { speaking: 1, listening: 0.75, thinking: 0.6, idle: 0.35 };
const WAITING: AgentIdentity = { id: "waiting", displayName: "Beauty advisor", roleLabel: "Welcome" };

function Identity({ agent, className }: { agent: AgentIdentity; className: string }) {
  return (
    <div className={className} style={{ gridArea: "1 / 1", minWidth: 0 }}>
      <h2 style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.015em", color: TEXT }}>{agent.displayName}</h2>
      <p style={{ fontSize: 18, fontWeight: 500, color: MUTED, marginTop: 6 }}>{agent.roleLabel}</p>
    </div>
  );
}

function ActivityChip({ text, activity }: { text: string; activity: AgentActivity }) {
  const live = activity === "speaking" || activity === "listening";
  return (
    <span
      aria-live="polite"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 20px",
        borderRadius: 999,
        fontSize: 18,
        fontWeight: 600,
        background: live ? AMBER_SOFT : "rgba(255, 255, 255, 0.06)",
        color: live ? AMBER : activity === "thinking" ? TEXT : FAINT,
        transition: "background-color 300ms ease, color 300ms ease",
      }}
    >
      <span style={{ width: 9, height: 9, borderRadius: 999, background: "currentColor", animation: live ? "em-pulse 1.6s ease-in-out infinite" : undefined }} />
      {text}
      {activity === "thinking" && (
        <span aria-hidden style={{ marginLeft: -6 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ animation: `em-dots 1.2s ${i * 0.2}s infinite` }}>.</span>
          ))}
        </span>
      )}
    </span>
  );
}

function Roster({ agents, activeIndex }: { agents: AgentIdentity[]; activeIndex: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {agents.map((agent, index) => {
        const active = index === activeIndex;
        return (
          <span
            key={agent.id}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              fontSize: 15,
              fontWeight: 600,
              border: `1px solid ${active ? "rgba(255, 154, 60, 0.45)" : EDGE}`,
              background: active ? AMBER_SOFT : "transparent",
              color: active ? AMBER : index < activeIndex ? MUTED : FAINT,
              transition: "all 500ms ease",
            }}
          >
            {agent.roleLabel}
          </span>
        );
      })}
    </div>
  );
}

/** The active agent by role, its voice, and the handover: the name crossfades and the bar flashes amber. */
export function Presence({
  agent,
  agents,
  activity,
  status,
  language,
}: {
  agent: AgentIdentity | null;
  agents: AgentIdentity[];
  activity: AgentActivity;
  status: VoiceAgent["status"];
  language: Language;
}) {
  const current = agent ?? WAITING;
  const index = agents.findIndex((a) => a.id === current.id);
  const previous = index > 0 ? agents[index - 1] : null;
  const label = status === "starting" ? "Connecting" : status === "error" ? "Reconnecting" : labels(language).activity[activity];

  return (
    <section style={{ position: "relative", flex: "none" }}>
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: -110,
          top: -120,
          width: 600,
          height: 340,
          borderRadius: "50%",
          background: "radial-gradient(closest-side, rgba(255, 154, 60, 0.36), rgba(255, 154, 60, 0.1) 55%, transparent)",
          filter: "blur(20px)",
          opacity: GLOW[activity],
          transition: "opacity 700ms ease",
          animation: activity === "speaking" ? "em-glow 2.4s ease-in-out infinite" : undefined,
          zIndex: -1,
          pointerEvents: "none",
        }}
      />
      <div style={{ ...glass(28), position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: 32, padding: "20px 28px" }}>
        {previous && (
          <span
            key={`flash-${current.id}`}
            aria-hidden
            style={{ position: "absolute", inset: 0, background: "radial-gradient(70% 160% at 22% 50%, rgba(255, 154, 60, 0.42), transparent 70%)", animation: "em-flash 1.5s ease-out both", pointerEvents: "none" }}
          />
        )}
        <Waveform activity={status === "live" ? activity : "idle"} />
        <div style={{ display: "grid", flex: 1, minWidth: 0 }}>
          {previous && <Identity key={`out-${current.id}`} agent={previous} className="em-out" />}
          <Identity key={`in-${current.id}`} agent={current} className="em-in" />
        </div>
        <ActivityChip text={label} activity={activity} />
        {agents.length > 1 && <Roster agents={agents} activeIndex={index} />}
      </div>
    </section>
  );
}
