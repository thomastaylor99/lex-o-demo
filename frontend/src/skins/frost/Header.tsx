import { labels } from "@/components/i18n";

import type { SkinProps } from "../types";
import { ReplayIcon } from "./icons";
import { BUBBLE, fs, INK, TRACK, YELLOW } from "./theme";

/** Bar heights of the voice in the badge, in px. */
const BADGE_BARS = [9, 17, 24, 15, 9];

/**
 * The screen's title: a black disc holding the yellow voice, then its role ("Beauty advisor").
 * L'Oréal's logo stays on the welcome screen.
 */
export function Wordmark({ advisor }: { advisor: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 13, whiteSpace: "nowrap" }}>
      <span aria-hidden style={{ width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center", gap: 3, borderRadius: 999, background: INK }}>
        {BADGE_BARS.map((height, index) => (
          <span key={index} style={{ width: 3.5, height, borderRadius: 3, background: YELLOW }} />
        ))}
      </span>
      <span style={{ fontSize: fs(32), fontWeight: 600, letterSpacing: "-0.025em", color: INK }}>{advisor}</span>
    </span>
  );
}

/** The switch for the V2 camera panel, shown only with `?camera=1`. */
function CameraToggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className="fr-press"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 9,
        borderRadius: 999,
        padding: "7px 8px 7px 14px",
        background: BUBBLE,
        color: INK,
        fontSize: fs(15),
        fontWeight: 500,
        cursor: "pointer",
      }}
    >
      {label}
      <span style={{ position: "relative", width: 32, height: 20, borderRadius: 999, background: on ? INK : TRACK, transition: "background-color 220ms" }}>
        <span
          style={{
            position: "absolute",
            top: 3,
            left: on ? 15 : 3,
            width: 14,
            height: 14,
            borderRadius: 999,
            background: on ? YELLOW : "#fff",
            transition: "left 220ms, background-color 220ms",
          }}
        />
      </span>
    </button>
  );
}

/** The title on the left; Restart and the camera switch on the right. The stats sit in the right quarter. */
export function Header({ agent }: SkinProps) {
  const { language, restart, camera, cameraSwitch, toggleCamera } = agent;
  const l = labels(language);

  return (
    <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, padding: "22px 0 14px" }}>
      <Wordmark advisor={l.advisor} />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          onClick={restart}
          className="fr-press"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            borderRadius: 999,
            padding: "9px 16px",
            background: "#fff",
            boxShadow: `inset 0 0 0 1px ${TRACK}`,
            color: INK,
            fontSize: fs(16),
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <ReplayIcon size={15} />
          {l.restart}
        </button>
        {cameraSwitch && <CameraToggle label={l.camera} on={camera} onToggle={toggleCamera} />}
      </div>
    </header>
  );
}
