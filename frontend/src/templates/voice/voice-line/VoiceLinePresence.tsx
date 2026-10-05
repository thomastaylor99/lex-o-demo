import type { CSSProperties } from "react";

import { labels } from "@/components/i18n";
import type { Language } from "@/lib/events";
import type { AgentActivity, AgentIdentity } from "@/lib/voice-agent";
import { ChevronIcon } from "@/skins/frost/icons";
import { EASE, fs, INK, MUTED, QUIET } from "@/skins/frost/theme";

import { AgentAvatar } from "../AgentAvatar";

/**
 * Stacked names: the active one shows, the others wait above or below, blurred. The old name
 * leaves quickly; the new one lands as the sweep passes under it.
 */
function nameLayer(offset: number): CSSProperties {
  const on = offset === 0;
  const fade = on ? "420ms ease 140ms" : "260ms ease";
  const move = on ? `600ms ${EASE} 140ms` : `360ms ${EASE}`;
  return {
    gridArea: "1 / 1",
    opacity: on ? 1 : 0,
    transform: on ? "none" : `translateY(${offset < 0 ? -10 : 10}px)`,
    filter: on ? "none" : "blur(5px)",
    transition: `opacity ${fade}, transform ${move}, filter ${fade}`,
  };
}

/**
 * Who is speaking, in the header after the wordmark: the agent's yellow disc, its name, and the
 * state in muted text. After a handover the state gives way for three seconds to the relay
 * ("Welcome > Skincare"); keyed CSS animations time it, so no timer runs.
 */
export function VoiceLinePresence(props: {
  agents: AgentIdentity[];
  activeAgent: AgentIdentity | null;
  mode: AgentActivity;
  language: Language;
}) {
  const { agents, activeAgent, mode, language } = props;
  const l = labels(language);
  const id = activeAgent?.id ?? "";
  const index = agents.findIndex((agent) => agent.id === id);
  const previous = index > 0 ? agents[index - 1] : null;

  return (
    <div role="status" aria-live="polite" style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: 18, minWidth: 0, whiteSpace: "nowrap" }}>
      <span style={{ position: "relative", display: "grid", borderRadius: 999 }}>
        {previous && <span key={`ring-${id}`} className="vl-ring" aria-hidden style={{ position: "absolute", inset: 0, borderRadius: 999 }} />}
        <AgentAvatar agent={activeAgent} size={30} />
      </span>

      <span style={{ display: "grid", fontSize: fs(24), fontWeight: 600, letterSpacing: "-0.012em", color: INK }}>
        {agents.map((agent, position) => (
          <span key={agent.id} aria-hidden={position !== index} style={nameLayer(position - index)}>
            {agent.displayName}
          </span>
        ))}
      </span>

      <span style={{ display: "grid", alignItems: "center", fontSize: fs(20), fontWeight: 500, color: MUTED }}>
        {previous && activeAgent && (
          <span
            key={`relay-${id}`}
            className="vl-relay"
            aria-hidden
            style={{ gridArea: "1 / 1", display: "inline-flex", alignItems: "center", gap: 6, opacity: 0 }}
          >
            {previous.roleLabel}
            <span style={{ display: "flex", color: QUIET }}>
              <ChevronIcon size={13} />
            </span>
            <span style={{ color: INK, fontWeight: 600 }}>{activeAgent.roleLabel}</span>
          </span>
        )}
        <span key={`state-${id}`} className={previous ? "vl-after" : undefined} style={{ gridArea: "1 / 1" }}>
          <span key={mode} className="vl-fade">
            {l.activity[mode]}
          </span>
        </span>
      </span>
    </div>
  );
}
