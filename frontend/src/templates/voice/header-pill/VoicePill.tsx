import { labels } from "@/components/i18n";
import type { Language } from "@/lib/events";
import type { AgentActivity, AgentIdentity, VoiceAgent } from "@/lib/voice-agent";
import { ChevronIcon } from "@/skins/frost/icons";
import { CARD_SHADOW, fs, INK, MUTED, QUIET, TRACK } from "@/skins/frost/theme";
import { Waveform } from "@/skins/frost/Waveform";

import { AgentAvatar } from "../AgentAvatar";

/** "Welcome > Skincare" by role, shown inside the pill for a few seconds after a handover. */
function Crumb({ agents, activeId }: { agents: AgentIdentity[]; activeId: string }) {
  return (
    <span className="hp-crumb" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: fs(15) }}>
      {agents.map((agent, index) => {
        const on = agent.id === activeId;
        return (
          <span key={agent.id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {index > 0 && (
              <span aria-hidden style={{ display: "flex", color: QUIET }}>
                <ChevronIcon size={12} />
              </span>
            )}
            <span style={{ color: on ? INK : MUTED, fontWeight: on ? 600 : 500 }}>{agent.roleLabel}</span>
          </span>
        );
      })}
    </span>
  );
}

/**
 * The voice in the header: a slim white pill with the agent's disc, name and state, and the yellow
 * waveform on a small black core. A handover pops the new disc, rings once and shows the relay inside.
 */
export function VoicePill(props: {
  agents: AgentIdentity[];
  activeAgent: AgentIdentity | null;
  activity: AgentActivity;
  status: VoiceAgent["status"];
  language: Language;
}) {
  const { agents, activeAgent, activity, status, language } = props;
  const l = labels(language);
  const mode: AgentActivity = status === "live" ? activity : "idle";
  // The first agent's arrival is the start of the conversation; any later one is a handover.
  const joined = activeAgent && agents.findIndex((agent) => agent.id === activeAgent.id) > 0 ? activeAgent : null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "relative",
        margin: "0 auto",
        display: "inline-flex",
        alignItems: "center",
        gap: 14,
        height: 56,
        padding: "0 8px",
        borderRadius: 999,
        background: "#fff",
        boxShadow: `inset 0 0 0 1px ${TRACK}, ${CARD_SHADOW}`,
      }}
    >
      {joined && <span key={`ring-${joined.id}`} className="fr-ring" aria-hidden style={{ position: "absolute", inset: 0, borderRadius: 999, pointerEvents: "none" }} />}
      <AgentAvatar agent={activeAgent} size={40} />
      <span key={`name-${activeAgent?.id ?? ""}`} className="fr-in" style={{ display: "flex", flexDirection: "column", lineHeight: 1.15, whiteSpace: "nowrap" }}>
        <span style={{ fontSize: fs(19), fontWeight: 600, letterSpacing: "-0.01em", color: INK }}>{activeAgent?.displayName ?? l.advisor}</span>
        <span style={{ fontSize: fs(15), color: MUTED }}>{l.activity[mode]}</span>
      </span>
      {joined && <Crumb key={`crumb-${joined.id}`} agents={agents} activeId={joined.id} />}
      <span style={{ width: 124, height: 40, display: "flex", alignItems: "center", padding: "0 12px", borderRadius: 999, background: INK }}>
        <Waveform activity={mode} bars={10} height={22} />
      </span>
    </div>
  );
}
