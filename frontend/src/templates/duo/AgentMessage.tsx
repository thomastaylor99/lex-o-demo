import { AMBER, CARD_SHADOW, MUTED, TEXT } from "./styles";

/** An agent line: large dark text on a white card with a soft shadow, the role as a small label. */
export function AgentMessage({ role, text, final }: { role: string; text: string; final: boolean }) {
  return (
    <div className="du-in" style={{ alignSelf: "flex-start", maxWidth: "82%", background: "#fff", borderRadius: 24, boxShadow: CARD_SHADOW, padding: "18px 30px 22px" }}>
      <p style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 16, fontWeight: 700, color: MUTED, marginBottom: 6 }}>
        <span style={{ width: 9, height: 9, borderRadius: 999, background: AMBER }} />
        {role}
      </p>
      <p className={final ? undefined : "du-caret du-caret-amber"} style={{ fontSize: 29, lineHeight: 1.4, fontWeight: 500, letterSpacing: "-0.01em", color: TEXT }}>
        {text}
      </p>
    </div>
  );
}
