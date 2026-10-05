import { labels } from "@/components/i18n";
import type { Language } from "@/lib/events";
import type { AgentIdentity } from "@/lib/voice-agent";
import { fs, INK, MUTED } from "@/skins/frost/theme";

import { AgentAvatar } from "../AgentAvatar";

const LIFT = "0 1px 2px rgba(11, 11, 12, 0.05), 0 12px 32px rgba(11, 11, 12, 0.08)";

/**
 * The handover as a moment of the conversation, centred: the previous agent's mark, small and greyed,
 * tucked behind the new agent's, which pops in with a yellow ring; then "Skincare expert joined".
 */
export function InlineVoiceHandover(props: { from: AgentIdentity | null; to: AgentIdentity | null; name: string; language: Language }) {
  const { from, to, name, language } = props;

  return (
    <div
      role="status"
      className="fr-pop"
      style={{
        alignSelf: "center",
        display: "flex",
        alignItems: "center",
        gap: 14,
        margin: "8px 0",
        borderRadius: 999,
        padding: "7px 26px 7px 7px",
        background: "#fff",
        boxShadow: LIFT,
      }}
    >
      <span style={{ display: "flex", alignItems: "center" }}>
        {from && (
          <span style={{ display: "flex", marginRight: -8, filter: "grayscale(1)", opacity: 0.6 }}>
            <AgentAvatar agent={from} size={30} />
          </span>
        )}
        <span style={{ position: "relative", display: "flex", borderRadius: 999, boxShadow: "0 0 0 3px #fff" }}>
          <span className="fr-ring" aria-hidden style={{ position: "absolute", inset: 0, borderRadius: 999 }} />
          <AgentAvatar agent={to} size={46} />
        </span>
      </span>
      <span style={{ fontSize: fs(21), color: MUTED, whiteSpace: "nowrap" }}>
        <span style={{ color: INK, fontWeight: 600 }}>{name}</span> {labels(language).joined}
      </span>
    </div>
  );
}
