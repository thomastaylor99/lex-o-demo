import type { TranscriptEntry } from "@/lib/voice-agent";

import { BUBBLE, INK, MUTED, PARTIAL, TEXT_2, YELLOW, fs } from "./theme";

const DOT = { position: "absolute", inset: 0, borderRadius: 999, background: YELLOW } as const;

/** The agent's name, Lumen style: a small yellow dot before it, pulsing while the line streams. */
function AgentLabel({ name, streaming }: { name: string; streaming: boolean }) {
  return (
    <p style={{ display: "flex", alignItems: "center", gap: 8, fontSize: fs(16), fontWeight: 500, color: MUTED, marginBottom: 6 }}>
      <span aria-hidden style={{ position: "relative", flex: "0 0 8px", height: 8 }}>
        {streaming && <span className="fr-pulse" style={DOT} />}
        <span style={DOT} />
      </span>
      {name}
    </p>
  );
}

/** What the agent says: large black text, no bubble. The name shows on the first line of a run only. */
export function AgentLine({ entry, label }: { entry: TranscriptEntry; label: string | null }) {
  return (
    <div className="fr-in" style={{ alignSelf: "flex-start", maxWidth: "86%" }}>
      {label && <AgentLabel name={label} streaming={!entry.final} />}
      <p style={{ fontSize: fs(31), lineHeight: 1.36, fontWeight: 500, letterSpacing: "-0.012em", color: INK, textWrap: "pretty" }}>{entry.text}</p>
    </div>
  );
}

/** What the visitor says, in a light grey bubble on the right. While they speak: grey with a caret. */
export function VisitorLine({ entry }: { entry: TranscriptEntry }) {
  return (
    <div className="fr-in" style={{ alignSelf: "flex-end", maxWidth: "64%", borderRadius: 20, padding: "13px 21px", background: BUBBLE }}>
      <p
        className={entry.final ? undefined : "fr-caret"}
        style={{ fontSize: fs(24), lineHeight: 1.42, color: entry.final ? TEXT_2 : PARTIAL, transition: "color 300ms" }}
      >
        {entry.text}
      </p>
    </div>
  );
}

/** The handover, marked in the transcript: a small black chip, centred ("Skincare expert joined"). */
export function HandoverChip({ text }: { text: string }) {
  return (
    <div
      className="fr-pop"
      style={{
        alignSelf: "center",
        display: "inline-flex",
        alignItems: "center",
        gap: 9,
        margin: "2px 0",
        borderRadius: 999,
        padding: "8px 17px 8px 13px",
        background: INK,
        color: "#fff",
        fontSize: fs(17),
        fontWeight: 500,
      }}
    >
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: YELLOW }} />
      {text}
    </div>
  );
}
