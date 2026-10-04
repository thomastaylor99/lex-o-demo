import { formatSeconds } from "@/components/i18n";
import type { DemoAgent } from "@/templates/useDemoAgent";

import { AMBER, DISPLAY, LINE, MUTED, SURFACE, TEXT, WHITE } from "./theme";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ display: "flex", alignItems: "baseline", gap: 8, background: SURFACE, borderRadius: 999, padding: "9px 18px", fontSize: 16, color: MUTED }}>
      {label}
      <b key={value} className="lm-fade" style={{ color: TEXT, fontSize: 18, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </b>
    </span>
  );
}

/** A small switch to preview the V2 camera slot. */
function CameraToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 6px 6px 10px", fontSize: 16, fontWeight: 600, color: TEXT, cursor: "pointer" }}
    >
      Camera
      <span style={{ position: "relative", width: 42, height: 24, borderRadius: 999, background: on ? AMBER : LINE, transition: "background 250ms ease" }}>
        <span
          style={{
            position: "absolute",
            top: 3,
            left: on ? 21 : 3,
            width: 18,
            height: 18,
            borderRadius: 999,
            background: WHITE,
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.25)",
            transition: "left 250ms ease",
          }}
        />
      </span>
    </button>
  );
}

/** Wordmark, reply times and cost, the camera preview switch and replay. */
export function Header({ agent }: { agent: DemoAgent }) {
  const { replyStats, costEur, language, camera, toggleCamera, replay } = agent;
  const seconds = (ms: number | null) => (ms === null ? "" : formatSeconds(ms, language));

  return (
    <header
      style={{
        gridColumn: "1 / -1",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "18px 48px",
        borderBottom: `1px solid ${LINE}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ width: 14, height: 14, borderRadius: 999, background: AMBER, boxShadow: "0 0 0 5px rgba(245, 158, 11, 0.18)" }} />
        <span style={{ fontFamily: DISPLAY, fontSize: 36, lineHeight: 1, color: TEXT }}>L&rsquo;Oréal</span>
        <span style={{ fontSize: 19, color: MUTED, marginLeft: 4 }}>Beauty advisor</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {replyStats.count > 0 && <Stat label="Average reply" value={seconds(replyStats.averageMs)} />}
        {replyStats.count > 0 && <Stat label="p90" value={seconds(replyStats.p90Ms)} />}
        <Stat label="Cost" value={`€${costEur.toFixed(3)}`} />
        <CameraToggle on={camera} onToggle={toggleCamera} />
        <button
          type="button"
          onClick={replay}
          style={{ display: "flex", alignItems: "center", gap: 9, marginLeft: 4, background: TEXT, color: WHITE, borderRadius: 999, padding: "11px 22px", fontSize: 16, fontWeight: 600, cursor: "pointer" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden fill="none" stroke={AMBER} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
          </svg>
          Replay
        </button>
      </div>
    </header>
  );
}
