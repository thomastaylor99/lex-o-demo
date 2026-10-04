import type { TranscriptEntry } from "@/lib/voice-agent";

import { AMBER, AMBER_TINT, CARD_SHADOW, INK_SOFT, MUTED, TEXT, VISITOR, WHITE } from "./theme";

const LABEL = { fontSize: 15, fontWeight: 600, color: MUTED, marginBottom: 6 } as const;

/** What the agent says: a white card with a soft shadow and the agent's role above the words. */
export function AgentLine({ entry, name, continued }: { entry: TranscriptEntry; name: string; continued: boolean }) {
  return (
    <div
      className="lm-pop"
      style={{
        alignSelf: "flex-start",
        maxWidth: "82%",
        background: WHITE,
        borderRadius: 24,
        boxShadow: CARD_SHADOW,
        padding: continued ? "18px 28px" : "16px 28px 20px",
        marginTop: continued ? -8 : 0,
      }}
    >
      {!continued && (
        <p style={{ ...LABEL, display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ width: 9, height: 9, borderRadius: 999, background: AMBER }} />
          {name}
        </p>
      )}
      <p className={entry.final ? undefined : "lm-caret"} style={{ fontSize: 28, lineHeight: 1.42, color: TEXT }}>
        {entry.text}
      </p>
    </div>
  );
}

/** What the visitor says: a grey card on the right. While they speak, the words arrive with a caret. */
export function VisitorLine({ entry, label }: { entry: TranscriptEntry; label: string }) {
  return (
    <div
      className="lm-pop"
      style={{ alignSelf: "flex-end", maxWidth: "68%", background: VISITOR, borderRadius: 24, padding: "14px 26px 18px" }}
    >
      <p style={{ ...LABEL, marginBottom: 4, textAlign: "right" }}>{label}</p>
      <p className={entry.final ? undefined : "lm-caret"} style={{ fontSize: 23, lineHeight: 1.45, color: entry.final ? TEXT : INK_SOFT }}>
        {entry.text}
      </p>
    </div>
  );
}

/** The handover moment: a centred amber pill that glows as the specialist joins. */
export function HandoverPill({ name }: { name: string }) {
  return (
    <div
      className="lm-handover"
      style={{
        alignSelf: "center",
        display: "flex",
        alignItems: "center",
        gap: 12,
        margin: "10px 0",
        borderRadius: 999,
        padding: "11px 24px 11px 14px",
        background: AMBER_TINT,
        color: TEXT,
        fontSize: 19,
        fontWeight: 600,
      }}
    >
      <span style={{ position: "relative", width: 26, height: 26, display: "grid", placeItems: "center" }}>
        <span className="lm-ring" style={{ position: "absolute", inset: 6, borderRadius: 999, border: `2px solid ${AMBER}`, animationIterationCount: 3 }} />
        <span style={{ width: 12, height: 12, borderRadius: 999, background: AMBER }} />
      </span>
      {name} joined
    </div>
  );
}
