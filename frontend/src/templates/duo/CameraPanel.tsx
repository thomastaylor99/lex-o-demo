import { CameraIcon } from "./icons";
import { AMBER, CARD_SHADOW, MUTED, TEXT } from "./styles";

/** V2 slot: where the camera preview will sit. A placeholder frame only, no camera is opened. */
export function CameraPanel() {
  return (
    <aside className="du-in" style={{ flex: "0 0 360px", display: "flex", flexDirection: "column", gap: 16, paddingTop: 20 }}>
      <div
        style={{
          position: "relative",
          aspectRatio: "3 / 4",
          borderRadius: 28,
          overflow: "hidden",
          background: "radial-gradient(120% 90% at 50% 32%, #2C3039 0%, #17191E 55%, #0B0C0F 100%)",
          boxShadow: CARD_SHADOW,
        }}
      >
        {/* Soft face-framing oval. */}
        <span
          style={{
            position: "absolute",
            left: "50%",
            top: "47%",
            width: "58%",
            height: "60%",
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            border: "2px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "0 0 0 999px rgba(0, 0, 0, 0.22), inset 0 0 48px rgba(255, 154, 60, 0.16)",
          }}
        />
        {/* Scanning shimmer. */}
        <span
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: "38%",
            background: "linear-gradient(to bottom, rgba(255, 154, 60, 0) 0%, rgba(255, 154, 60, 0.15) 50%, rgba(255, 154, 60, 0) 100%)",
            animation: "du-scan 3.6s ease-in-out infinite",
          }}
        />
        <span
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            borderRadius: 999,
            padding: "7px 14px",
            background: "rgba(14, 15, 18, 0.6)",
            color: "#F3F4F6",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: 999, background: AMBER, animation: "du-dot 1.6s ease-in-out infinite" }} />
          Preview
        </span>
      </div>
      <p style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 19, fontWeight: 700, lineHeight: 1.35, color: TEXT }}>
        <CameraIcon size={22} />
        Camera: the expert will look at your skin
      </p>
      <p style={{ fontSize: 16, color: MUTED, marginTop: -8, paddingLeft: 32 }}>Arrives with version two</p>
    </aside>
  );
}
