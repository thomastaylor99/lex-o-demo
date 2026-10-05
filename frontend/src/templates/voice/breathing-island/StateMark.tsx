import type { AgentActivity } from "@/lib/voice-agent";
import { INK, YELLOW } from "@/skins/frost/theme";

const DOT = { position: "absolute", inset: 0, borderRadius: 999, background: YELLOW } as const;

/** The island's small state mark: a pulsing yellow dot while listening, three dots in turn while thinking. */
export function StateMark({ mode }: { mode: AgentActivity }) {
  if (mode === "listening") {
    return (
      <span aria-hidden style={{ position: "relative", flex: "0 0 10px", height: 10, marginRight: 10 }}>
        <span className="fr-pulse" style={DOT} />
        <span style={DOT} />
      </span>
    );
  }
  if (mode === "thinking") {
    return (
      <span aria-hidden style={{ display: "flex", gap: 4, marginRight: 10 }}>
        {[0, 1, 2].map((i) => (
          <span key={i} className="bi-dot" style={{ width: 6, height: 6, borderRadius: 999, background: INK, animationDelay: `${i * 160}ms` }} />
        ))}
      </span>
    );
  }
  return null;
}
