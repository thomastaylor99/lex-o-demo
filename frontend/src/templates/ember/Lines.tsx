import { AMBER, AMBER_LINE, AMBER_SOFT, EDGE, FAINT, MUTED, ON_AMBER, TEXT } from "./theme";

/** What the agent says: large text on a soft dark rounded card. */
export function AgentLine({ name, text, live }: { name: string; text: string; live: boolean }) {
  return (
    <div
      className="em-rise"
      style={{
        alignSelf: "flex-start",
        maxWidth: "84%",
        background: "rgba(255, 255, 255, 0.045)",
        border: `1px solid ${EDGE}`,
        borderRadius: 26,
        padding: "18px 28px 22px",
      }}
    >
      <p style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 600, color: MUTED, marginBottom: 6 }}>
        {live && <span style={{ width: 8, height: 8, borderRadius: 999, background: AMBER, animation: "em-pulse 1.2s ease-in-out infinite" }} />}
        {name}
      </p>
      <p className={live ? "em-caret" : undefined} style={{ fontSize: 28, lineHeight: 1.42, fontWeight: 500, color: TEXT, letterSpacing: "-0.005em" }}>
        {text}
      </p>
    </div>
  );
}

/** What the visitor says, right-aligned on a lighter card. The live partial carries a caret. */
export function VisitorLine({ text, live }: { text: string; live: boolean }) {
  return (
    <div
      className="em-rise"
      style={{
        alignSelf: "flex-end",
        maxWidth: "66%",
        background: "rgba(255, 255, 255, 0.1)",
        border: `1px solid ${EDGE}`,
        borderRadius: 26,
        padding: "14px 24px 18px",
      }}
    >
      <p style={{ fontSize: 15, fontWeight: 600, color: FAINT, marginBottom: 4, textAlign: "right" }}>You</p>
      <p className={live ? "em-caret" : undefined} style={{ fontSize: 24, lineHeight: 1.45, color: live ? MUTED : TEXT }}>
        {text}
      </p>
    </div>
  );
}

/** The handover moment: a pill slides in when the next agent joins. */
export function HandoverPill({ name }: { name: string }) {
  return (
    <div
      className="em-slide"
      style={{
        alignSelf: "center",
        display: "flex",
        alignItems: "center",
        gap: 12,
        margin: "6px 0",
        padding: "8px 24px 8px 8px",
        borderRadius: 999,
        background: AMBER_SOFT,
        border: `1px solid ${AMBER_LINE}`,
        boxShadow: "0 0 36px rgba(255, 154, 60, 0.18)",
      }}
    >
      <span
        aria-hidden
        style={{ width: 34, height: 34, borderRadius: 999, background: AMBER, color: ON_AMBER, display: "grid", placeItems: "center", fontSize: 16, fontWeight: 700 }}
      >
        {name.charAt(0)}
      </span>
      <span style={{ fontSize: 19, fontWeight: 600, color: TEXT }}>
        <span style={{ color: AMBER }}>{name}</span> joined
      </span>
    </div>
  );
}
