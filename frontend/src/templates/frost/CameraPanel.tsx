import { INK, YELLOW } from "./theme";

const FRAME = "radial-gradient(120% 85% at 50% 34%, #383B42 0%, #18191C 58%, #0B0B0C 100%)";
const SHIMMER =
  "linear-gradient(to bottom, rgba(255, 210, 63, 0) 38%, rgba(255, 210, 63, 0.1) 46%, rgba(255, 255, 255, 0.16) 50%, rgba(255, 210, 63, 0.1) 54%, rgba(255, 210, 63, 0) 62%)";

/** V2 slot: where the expert will look at the visitor's skin. A placeholder: no camera starts. */
export function CameraPanel() {
  return (
    <aside
      className="fr-open"
      aria-label="Camera preview"
      style={{ flex: "0 0 380px", position: "relative", minHeight: 0, borderRadius: 24, overflow: "hidden", background: FRAME }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: "50%",
          top: "43%",
          width: 230,
          height: 300,
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.3), 0 0 56px 8px rgba(255, 255, 255, 0.1), 0 0 0 999px rgba(0, 0, 0, 0.3)",
        }}
      />
      <span aria-hidden className="fr-scan" style={{ position: "absolute", inset: 0, background: SHIMMER, filter: "blur(4px)" }} />
      <span
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          borderRadius: 999,
          padding: "8px 16px",
          background: "rgba(255, 255, 255, 0.12)",
          color: "#fff",
          fontSize: 15,
          fontWeight: 500,
        }}
      >
        <span className="fr-breathe" style={{ width: 9, height: 9, borderRadius: 999, background: YELLOW }} />
        Camera preview
      </span>
      <p
        style={{
          position: "absolute",
          left: 18,
          right: 18,
          bottom: 18,
          borderRadius: 16,
          padding: "16px 20px",
          background: "#fff",
          color: INK,
          fontSize: 19,
          fontWeight: 500,
          lineHeight: 1.35,
        }}
      >
        Camera: the expert will look at your skin
      </p>
    </aside>
  );
}
