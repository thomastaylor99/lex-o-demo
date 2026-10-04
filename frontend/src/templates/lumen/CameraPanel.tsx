import { AMBER, LIFT_SHADOW } from "./theme";

const FRAME_FILL = "radial-gradient(120% 90% at 50% 30%, #334155 0%, #1E293B 48%, #0F172A 100%)";
const SCAN_FILL = "linear-gradient(to bottom, rgba(245, 158, 11, 0) 0%, rgba(245, 158, 11, 0.12) 50%, rgba(245, 158, 11, 0) 100%)";

/** V2 slot: the frame where the expert will look at the visitor's skin. A placeholder, no camera access. */
export function CameraPanel() {
  return (
    <aside className="lm-slide" style={{ flex: "0 0 400px", display: "flex", minHeight: 0, padding: "4px 0 16px" }}>
      <div style={{ position: "relative", flex: 1, borderRadius: 28, overflow: "hidden", background: FRAME_FILL, boxShadow: LIFT_SHADOW }}>
        <span className="lm-scanband" style={{ position: "absolute", left: 0, right: 0, top: 0, height: "38%", background: SCAN_FILL }} />
        <span
          className="lm-soft"
          style={{
            position: "absolute",
            left: "50%",
            top: "45%",
            width: "62%",
            height: "60%",
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            border: "2px solid rgba(255, 255, 255, 0.45)",
            boxShadow: "0 0 0 9999px rgba(2, 6, 23, 0.3), inset 0 0 56px rgba(245, 158, 11, 0.18)",
          }}
        />
        <span
          style={{
            position: "absolute",
            top: 18,
            left: 18,
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderRadius: 999,
            padding: "7px 14px",
            background: "rgba(255, 255, 255, 0.14)",
            color: "#fff",
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          <span className="lm-pulse" style={{ width: 9, height: 9, borderRadius: 999, background: AMBER }} />
          Camera preview
        </span>
        <p style={{ position: "absolute", left: 24, right: 24, bottom: 26, color: "#fff", fontSize: 20, lineHeight: 1.35, textAlign: "center", fontWeight: 500 }}>
          Camera: the expert will look at your skin
        </p>
      </div>
    </aside>
  );
}
