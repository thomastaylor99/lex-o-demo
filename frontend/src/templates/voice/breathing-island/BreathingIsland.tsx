import type { CSSProperties } from "react";

import { labels } from "@/components/i18n";
import type { Language } from "@/lib/events";
import type { AgentActivity, AgentIdentity, VoiceAgent } from "@/lib/voice-agent";
import { ChevronIcon } from "@/skins/frost/icons";
import { fs, INK, MUTED, QUIET, SPRING, TRACK } from "@/skins/frost/theme";
import { Waveform } from "@/skins/frost/Waveform";

import { AgentAvatar } from "../AgentAvatar";
import { StateMark } from "./StateMark";

const FROSTED: CSSProperties = {
  background: "rgba(255, 255, 255, 0.78)",
  backdropFilter: "blur(20px) saturate(1.4)",
  WebkitBackdropFilter: "blur(20px) saturate(1.4)",
  boxShadow: `inset 0 0 0 1px ${TRACK}, 0 14px 36px rgba(11, 11, 12, 0.08)`,
};

/**
 * A small frosted island over the conversation. Compact while listening or thinking; it widens with a
 * spring while the agent speaks, revealing the yellow waveform on a black core. At a handover it opens
 * widest for a few seconds, from the previous agent to the new one, and rings once.
 */
export function BreathingIsland(props: {
  agents: AgentIdentity[];
  activeAgent: AgentIdentity | null;
  activity: AgentActivity;
  status: VoiceAgent["status"];
  language: Language;
}) {
  const { agents, activeAgent, activity, status, language } = props;
  const l = labels(language);
  const mode: AgentActivity = status === "live" ? activity : "idle";
  const speaking = mode === "speaking";
  const index = activeAgent ? agents.findIndex((agent) => agent.id === activeAgent.id) : -1;
  // The agent who handed over; the first agent's arrival is the start of the conversation.
  const previous = index > 0 ? agents[index - 1] : undefined;
  const id = activeAgent?.id ?? "";

  return (
    <div role="status" aria-live="polite" style={{ position: "relative", display: "inline-flex", alignItems: "center", height: 60, padding: "0 10px", borderRadius: 999, ...FROSTED }}>
      {previous && <span key={`ring-${id}`} className="fr-ring" aria-hidden style={{ position: "absolute", inset: 0, borderRadius: 999, pointerEvents: "none" }} />}
      {previous && (
        <span key={`from-${id}`} className="bi-handover" style={{ display: "inline-flex", alignItems: "center", gap: 10, whiteSpace: "nowrap" }}>
          <AgentAvatar agent={previous} size={32} />
          <span style={{ fontSize: fs(17), color: MUTED }}>{previous.displayName}</span>
          <span aria-hidden style={{ display: "flex", color: QUIET, marginRight: 10 }}>
            <ChevronIcon size={14} />
          </span>
        </span>
      )}
      <AgentAvatar agent={activeAgent} size={40} />
      <span key={`name-${id}`} className="fr-in" style={{ display: "flex", flexDirection: "column", margin: "0 16px 0 12px", lineHeight: 1.15, whiteSpace: "nowrap" }}>
        <span style={{ fontSize: fs(19), fontWeight: 600, letterSpacing: "-0.01em", color: INK }}>{activeAgent?.displayName ?? l.advisor}</span>
        <span style={{ fontSize: fs(15), color: MUTED }}>{l.activity[mode]}</span>
      </span>
      <StateMark mode={mode} />
      <span
        aria-hidden
        style={{
          display: "flex",
          alignItems: "center",
          height: 40,
          maxWidth: speaking ? 220 : 0,
          padding: speaking ? "0 14px" : 0,
          opacity: speaking ? 1 : 0,
          borderRadius: 999,
          background: INK,
          overflow: "hidden",
          transition: `max-width 800ms ${SPRING}, padding 800ms ${SPRING}, opacity 300ms`,
        }}
      >
        <span style={{ flex: "none", width: 184 }}>
          <Waveform activity={mode} bars={18} height={24} />
        </span>
      </span>
    </div>
  );
}
