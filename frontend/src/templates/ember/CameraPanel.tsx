import { AMBER, FAINT, TEXT, glass } from "./theme";

const FRAME = "radial-gradient(120% 90% at 50% 38%, #2C2F37 0%, #1A1C21 55%, #0E0F12 100%)";
const SHIMMER =
  "linear-gradient(180deg, transparent 0%, rgba(255, 154, 60, 0.07) 36%, rgba(255, 196, 140, 0.2) 50%, rgba(255, 154, 60, 0.07) 64%, transparent 100%)";

/** V2 slot: where the camera will sit next to the conversation. A placeholder frame, no camera access. */
export function CameraPanel() {
  return (
    <aside
      className="em-rise"
      aria-label="Camera preview"
      style={{ ...glass(28), flex: "0 0 380px", display: "flex", flexDirection: "column", gap: 16, padding: 16, minHeight: 0 }}
    >
      <div style={{ position: "relative", flex: 1, minHeight: 0, borderRadius: 22, overflow: "hidden", background: FRAME }}>
        <span
          style={{
            position: "absolute",
            left: "50%",
            top: "47%",
            width: "60%",
            height: "62%",
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            border: "2px solid rgba(255, 154, 60, 0.5)",
            boxShadow: "0 0 48px rgba(255, 154, 60, 0.16), inset 0 0 48px rgba(255, 154, 60, 0.08)",
          }}
        />
        <span style={{ position: "absolute", inset: 0, background: SHIMMER, animation: "em-scan 3.6s ease-in-out infinite" }} />
        <span
          style={{
            position: "absolute",
            top: 14,
            left: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 14px",
            borderRadius: 999,
            background: "rgba(14, 15, 18, 0.6)",
            color: TEXT,
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: 999, background: AMBER, animation: "em-pulse 1.8s ease-in-out infinite" }} />
          Preview
        </span>
      </div>
      <div style={{ padding: "0 6px 4px" }}>
        <p style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.3, color: TEXT }}>Camera: the expert will look at your skin</p>
        <p style={{ fontSize: 16, color: FAINT, marginTop: 6 }}>Preview of the next version</p>
      </div>
    </aside>
  );
}
