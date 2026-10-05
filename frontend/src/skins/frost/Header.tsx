import { formatCost, formatSeconds, labels } from "@/components/i18n";

import type { SkinProps } from "../types";
import { ReplayIcon } from "./icons";
import { BUBBLE, fs, INK, MUTED, ON_DARK_MUTED, TRACK, YELLOW } from "./theme";

/** "L'Oréal" as a text wordmark, then the screen's role. Shared with the welcome screen. */
export function Wordmark({ advisor }: { advisor: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 14, whiteSpace: "nowrap" }}>
      <span style={{ fontSize: fs(36), fontWeight: 700, letterSpacing: "-0.035em", color: INK }}>L&rsquo;Oréal</span>
      <span style={{ fontSize: fs(20), color: MUTED }}>{advisor}</span>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <span
      className="fr-pop"
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 7,
        borderRadius: 999,
        padding: "8px 15px",
        background: INK,
        color: "#fff",
        whiteSpace: "nowrap",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <span style={{ fontSize: fs(15), color: ON_DARK_MUTED }}>{label}</span>
      <span style={{ fontSize: fs(18), fontWeight: 600 }}>{value}</span>
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

/** Wordmark on the left; reply-time and cost pills, Restart and the camera switch on the right. */
export function Header({ agent }: SkinProps) {
  const { language, replyStats: stats, costEur, restart, camera, cameraSwitch, toggleCamera } = agent;
  const l = labels(language);
  const seconds = (ms: number | null) => (ms === null ? "" : formatSeconds(ms, language));

  return (
    <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, padding: "22px 0 14px" }}>
      <Wordmark advisor={l.advisor} />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {stats.count > 0 && <StatPill label={l.avgReply} value={seconds(stats.averageMs)} />}
        {stats.count > 0 && <StatPill label={l.p90} value={seconds(stats.p90Ms)} />}
        <StatPill label={l.cost} value={formatCost(costEur, language)} />
        <button
          type="button"
          onClick={restart}
          className="fr-press"
          style={{
            marginLeft: 10,
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            borderRadius: 999,
            padding: "9px 16px",
            background: INK,
            color: "#fff",
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
