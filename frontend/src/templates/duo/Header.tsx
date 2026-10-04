import { CameraIcon, ReplayIcon } from "./icons";
import { AMBER, MUTED, SURFACE, TEXT } from "./styles";

const pill = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  height: 46,
  padding: "0 18px",
  borderRadius: 999,
  background: SURFACE,
  fontSize: 16,
  fontWeight: 700,
  color: TEXT,
} as const;

/** The visitor side's header: wordmark and product name, then the presenter's camera toggle and replay. */
export function Header({ camera, toggleCamera, replay }: { camera: boolean; toggleCamera: () => void; replay: () => void }) {
  return (
    <header style={{ flex: "none", height: 96, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
        <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.03em", color: TEXT }}>L&rsquo;Oréal</span>
        <span style={{ fontSize: 19, fontWeight: 600, color: MUTED }}>Beauty advisor</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button type="button" className="du-button" onClick={toggleCamera} aria-pressed={camera} style={{ ...pill, color: camera ? TEXT : MUTED }}>
          <CameraIcon size={19} />
          Camera
          <span style={{ position: "relative", width: 38, height: 22, borderRadius: 999, background: camera ? AMBER : "#D5DBE3", transition: "background-color 250ms" }}>
            <span
              style={{
                position: "absolute",
                top: 3,
                left: camera ? 19 : 3,
                width: 16,
                height: 16,
                borderRadius: 999,
                background: "#fff",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.25)",
                transition: "left 250ms cubic-bezier(0.2, 0.7, 0.1, 1)",
              }}
            />
          </span>
        </button>
        <button type="button" className="du-button" onClick={replay} style={pill}>
          <ReplayIcon size={19} />
          Replay
        </button>
      </div>
    </header>
  );
}
