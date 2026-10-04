import { AMBER, ORB_FILL, TEXT } from "./styles";

/** The handover moment: a centred dark pill with a small orb that rings twice as the expert joins. */
export function HandoverPill({ name }: { name: string }) {
  return (
    <div style={{ alignSelf: "center", margin: "6px 0", animation: "du-pill 700ms cubic-bezier(0.2, 0.8, 0.2, 1) both" }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 14,
          background: TEXT,
          color: "#fff",
          borderRadius: 999,
          padding: "12px 26px 12px 14px",
          fontSize: 19,
          fontWeight: 700,
          boxShadow: "0 12px 32px rgba(15, 23, 42, 0.2), 0 0 0 6px rgba(255, 154, 60, 0.14)",
        }}
      >
        <span style={{ position: "relative", width: 26, height: 26 }} aria-hidden>
          <span style={{ position: "absolute", inset: 0, borderRadius: 999, border: `2px solid ${AMBER}`, animation: "du-ring 1.4s ease-out 2 both" }} />
          <span style={{ position: "absolute", inset: 4, borderRadius: 999, background: ORB_FILL }} />
        </span>
        {name} joined
      </span>
    </div>
  );
}
