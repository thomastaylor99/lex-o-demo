import type { TranscriptEntry } from "@/lib/voice-agent";

import { BUBBLE, INK, MUTED, PARTIAL, TEXT_2, YELLOW } from "./theme";

const LIVE_DOT = { width: 10, height: 10, borderRadius: 999, background: YELLOW, boxShadow: "0 0 0 4px rgba(255, 210, 63, 0.22)" } as const;

/** What the agent says: large black text, no bubble, a small grey role label above. */
export function AgentLine({ entry, label }: { entry: TranscriptEntry; label: string | null }) {
  return (
    <div className="fr-in" style={{ alignSelf: "flex-start", maxWidth: "86%" }}>
      {label && (
        <p style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 500, color: MUTED, marginBottom: 8 }}>
          {label}
          {!entry.final && <span className="fr-breathe" style={LIVE_DOT} />}
        </p>
      )}
      <p style={{ fontSize: 31, lineHeight: 1.36, fontWeight: 500, letterSpacing: "-0.012em", color: INK, textWrap: "pretty" }}>{entry.text}</p>
    </div>
  );
}

/** What the visitor says, in a light grey bubble on the right. While they speak: grey with a caret. */
export function VisitorLine({ entry }: { entry: TranscriptEntry }) {
  return (
    <div className="fr-in" style={{ alignSelf: "flex-end", maxWidth: "64%", borderRadius: 24, padding: "16px 26px", background: BUBBLE }}>
      <p className={entry.final ? undefined : "fr-caret"} style={{ fontSize: 24, lineHeight: 1.42, color: entry.final ? TEXT_2 : PARTIAL, transition: "color 300ms" }}>
        {entry.text}
      </p>
    </div>
  );
}

/** The handover, marked in the transcript: a small black chip, centred. */
export function HandoverChip({ name }: { name: string }) {
  return (
    <div
      className="fr-pop"
      style={{
        alignSelf: "center",
        display: "inline-flex",
        alignItems: "center",
        gap: 11,
        margin: "4px 0",
        borderRadius: 999,
        padding: "10px 20px 10px 15px",
        background: INK,
        color: "#fff",
        fontSize: 17,
        fontWeight: 500,
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: 999, background: YELLOW }} />
      {name} joined
    </div>
  );
}
