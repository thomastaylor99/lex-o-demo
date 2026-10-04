import type { CSSProperties, ReactNode } from "react";

import type { AgentActivity, AgentIdentity, VoiceAgent } from "@/lib/voice-agent";

import { DropIcon, SparkleIcon } from "./icons";
import { EASE, INK, ON_DARK_MUTED, SPRING, YELLOW } from "./theme";
import { Waveform } from "./Waveform";

const ACTIVITY: Record<AgentActivity, string> = {
  idle: "Ready",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
};
const ICONS: Record<string, ReactNode> = { "": <SparkleIcon />, concierge: <SparkleIcon />, skincare: <DropIcon /> };

/** Stacked layers: the active one shows, earlier ones drift up and later ones wait below, blurred. */
function layer(offset: number): CSSProperties {
  const on = offset === 0;
  return {
    position: "absolute",
    inset: 0,
    opacity: on ? 1 : 0,
    transform: on ? "none" : `translateY(${offset < 0 ? -16 : 16}px)`,
    filter: on ? "none" : "blur(6px)",
    transition: `opacity 520ms ease ${on ? 220 : 0}ms, transform 760ms ${EASE} ${on ? 220 : 0}ms, filter 520ms ease ${on ? 220 : 0}ms`,
  };
}

/**
 * The agent presence: a black capsule like a dynamic island, holding the active agent's role and
 * a yellow waveform. Each agent that joins widens it; the text crossfades and a yellow ring pulses.
 */
export function Island(props: {
  agents: AgentIdentity[];
  activeAgent: AgentIdentity | null;
  activity: AgentActivity;
  status: VoiceAgent["status"];
}) {
  const { agents, activeAgent, activity, status } = props;
  const waiting: AgentIdentity = { id: "", displayName: "Beauty advisor", roleLabel: status === "starting" ? "Connecting" : "Ready" };
  const cast = [waiting, ...agents];
  const active = Math.max(0, cast.findIndex((agent) => agent.id === (activeAgent?.id ?? "")));
  const mode: AgentActivity = status === "live" ? activity : "idle";

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "2px 0 22px" }}>
      <div
        role="status"
        aria-live="polite"
        style={{
          position: "relative",
          width: 560 + active * 160,
          maxWidth: "100%",
          height: 92,
          display: "flex",
          alignItems: "center",
          gap: 20,
          padding: "0 32px 0 17px",
          borderRadius: 999,
          background: INK,
          color: "#fff",
          boxShadow: "0 22px 48px rgba(11, 11, 12, 0.16)",
          transition: `width 950ms ${SPRING}`,
        }}
      >
        {activeAgent && (
          <span key={activeAgent.id} className="fr-ring" aria-hidden style={{ position: "absolute", inset: 0, borderRadius: 999, pointerEvents: "none" }} />
        )}
        <span aria-hidden style={{ position: "relative", flex: "0 0 58px", height: 58, borderRadius: 999, background: YELLOW, color: INK }}>
          {cast.map((agent, index) => (
            <span key={agent.id || "waiting"} style={{ ...layer(index - active), display: "grid", placeItems: "center" }}>
              {ICONS[agent.id] ?? <span style={{ fontSize: 24, fontWeight: 700 }}>{agent.displayName.charAt(0)}</span>}
            </span>
          ))}
        </span>
        <span style={{ position: "relative", flex: "0 0 236px", height: 62 }}>
          {cast.map((agent, index) => (
            <span
              key={agent.id || "waiting"}
              aria-hidden={index !== active}
              style={{ ...layer(index - active), display: "flex", flexDirection: "column", justifyContent: "center", whiteSpace: "nowrap" }}
            >
              <span style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.15 }}>{agent.displayName}</span>
              <span style={{ fontSize: 16, color: ON_DARK_MUTED, marginTop: 3 }}>{agent.roleLabel}</span>
            </span>
          ))}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <Waveform activity={mode} />
        </span>
        <span style={{ flex: "0 0 104px", textAlign: "right", fontSize: 18, fontWeight: 500, color: mode === "idle" ? ON_DARK_MUTED : "#fff" }}>
          {ACTIVITY[mode]}
        </span>
      </div>
    </div>
  );
}
