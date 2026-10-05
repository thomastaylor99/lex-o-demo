import type { CSSProperties, ReactNode } from "react";

import { labels } from "@/components/i18n";
import type { Language } from "@/lib/events";
import type { AgentActivity, AgentIdentity, VoiceAgent } from "@/lib/voice-agent";

import { DropIcon, SparkleIcon } from "./icons";
import { EASE, INK, ON_DARK_MUTED, SPRING, YELLOW, fs } from "./theme";
import { Waveform } from "./Waveform";

/** Icons by backend agent id; another agent shows its initial. "" is the advisor before any agent is active. */
const ICONS: Record<string, ReactNode> = { "": <SparkleIcon size={22} />, concierge: <SparkleIcon size={22} />, skincare: <DropIcon size={22} /> };

/** Stacked layers: the active one shows, earlier ones drift up and later ones wait below, blurred. */
function layer(offset: number): CSSProperties {
  const on = offset === 0;
  return {
    position: "absolute",
    inset: 0,
    opacity: on ? 1 : 0,
    transform: on ? "none" : `translateY(${offset < 0 ? -14 : 14}px)`,
    filter: on ? "none" : "blur(6px)",
    transition: `opacity 520ms ease ${on ? 220 : 0}ms, transform 760ms ${EASE} ${on ? 220 : 0}ms, filter 520ms ease ${on ? 220 : 0}ms`,
  };
}

/**
 * The agent presence: a black capsule like a dynamic island, holding the active agent's name, role
 * and a yellow waveform. Each handover widens it with a spring; the text crossfades and a yellow ring pulses.
 */
export function Island(props: {
  agents: AgentIdentity[];
  activeAgent: AgentIdentity | null;
  activity: AgentActivity;
  status: VoiceAgent["status"];
  language: Language;
}) {
  const { agents, activeAgent, activity, status, language } = props;
  const l = labels(language);
  const waiting: AgentIdentity = { id: "", displayName: l.advisor, roleLabel: l.activity.idle };
  const cast = [waiting, ...agents];
  const active = Math.max(0, cast.findIndex((agent) => agent.id === (activeAgent?.id ?? "")));
  const mode: AgentActivity = status === "live" ? activity : "idle";

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "relative",
        flex: "0 1 auto",
        width: 480 + active * 136,
        minWidth: 0,
        height: 76,
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "0 26px 0 14px",
        borderRadius: 999,
        background: INK,
        color: "#fff",
        boxShadow: "0 18px 40px rgba(11, 11, 12, 0.16)",
        transition: `width 950ms ${SPRING}`,
      }}
    >
      {activeAgent && (
        <span key={activeAgent.id} className="fr-ring" aria-hidden style={{ position: "absolute", inset: 0, borderRadius: 999, pointerEvents: "none" }} />
      )}
      <span aria-hidden style={{ position: "relative", flex: "0 0 48px", height: 48, borderRadius: 999, background: YELLOW, color: INK }}>
        {cast.map((agent, index) => (
          <span key={agent.id || "waiting"} style={{ ...layer(index - active), display: "grid", placeItems: "center" }}>
            {ICONS[agent.id] ?? <span style={{ fontSize: fs(24), fontWeight: 700 }}>{agent.displayName.charAt(0)}</span>}
          </span>
        ))}
      </span>
      <span style={{ position: "relative", flex: "0 0 200px", height: 52 }}>
        {cast.map((agent, index) => (
          <span
            key={agent.id || "waiting"}
            aria-hidden={index !== active}
            style={{ ...layer(index - active), display: "flex", flexDirection: "column", justifyContent: "center", whiteSpace: "nowrap" }}
          >
            <span style={{ fontSize: fs(26), fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.15 }}>{agent.displayName}</span>
            <span style={{ fontSize: fs(16), color: ON_DARK_MUTED, marginTop: 2 }}>{agent.roleLabel}</span>
          </span>
        ))}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <Waveform activity={mode} height={36} />
      </span>
      <span style={{ flex: "0 0 88px", textAlign: "right", fontSize: fs(18), fontWeight: 500, color: mode === "idle" ? ON_DARK_MUTED : "#fff" }}>
        {l.activity[mode]}
      </span>
    </div>
  );
}
