import { BUBBLE, RAISED, WHITE, WHITE_38, WHITE_64, YELLOW } from "./styles";

/** An agent line: large white type, no bubble. The speaker's name shows on their first line after a change of speaker. */
export function AgentLine({ text, final, name }: { text: string; final: boolean; name: string | null }) {
  return (
    <div className="ox-rise" style={{ alignSelf: "flex-start", maxWidth: "86%" }}>
      {name && (
        <p style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 17, fontWeight: 600, color: WHITE_38, marginBottom: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: YELLOW }} />
          {name}
        </p>
      )}
      <p className={final ? undefined : "ox-caret"} style={{ fontSize: 31, fontWeight: 500, lineHeight: 1.38, letterSpacing: "-0.01em", color: WHITE }}>
        {text}
      </p>
    </div>
  );
}

/** A visitor line in a rounded dark bubble on the right. A partial line is the live transcription, with a caret. */
export function VisitorLine({ text, final }: { text: string; final: boolean }) {
  return (
    <div className="ox-rise" style={{ alignSelf: "flex-end", maxWidth: "62%", background: BUBBLE, borderRadius: 28, padding: "18px 26px" }}>
      <p className={final ? undefined : "ox-caret"} style={{ fontSize: 24, lineHeight: 1.42, color: final ? WHITE : WHITE_64 }}>
        {text}
      </p>
    </div>
  );
}

/** The handover moment in the transcript: a small rounded chip, "Skincare expert joined". */
export function HandoverChip({ name }: { name: string }) {
  return (
    <div
      className="ox-chip"
      style={{
        alignSelf: "center",
        display: "flex",
        alignItems: "center",
        gap: 12,
        margin: "6px 0",
        background: RAISED,
        border: "1px solid rgba(255, 200, 61, 0.4)",
        borderRadius: 999,
        padding: "10px 24px 10px 12px",
        fontSize: 19,
        fontWeight: 600,
        color: WHITE,
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          background: "radial-gradient(circle at 36% 30%, #FFF4CC 0%, #FFC83D 55%, #D99A00 100%)",
          boxShadow: "0 0 16px rgba(255, 200, 61, 0.6)",
        }}
      />
      {name} joined
    </div>
  );
}
