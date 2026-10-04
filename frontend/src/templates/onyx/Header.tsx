import { formatSeconds } from "@/components/i18n";
import type { Language } from "@/lib/events";
import type { ReplyStats } from "@/lib/voice-agent";

import { BUBBLE, PANEL, WHITE, WHITE_38, WHITE_64, YELLOW } from "./styles";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ background: PANEL, borderRadius: 999, padding: "10px 18px", fontSize: 17, color: WHITE_38 }}>
      {label} <b style={{ color: WHITE, fontWeight: 600, marginLeft: 4 }}>{value}</b>
    </span>
  );
}

/** Wordmark, live reply stats and cost, Replay, and the V2 camera toggle. */
export function Header(props: {
  language: Language;
  stats: ReplyStats;
  costEur: number;
  camera: boolean;
  replay: () => void;
  toggleCamera: () => void;
}) {
  const { language, stats, costEur, camera, replay, toggleCamera } = props;
  const seconds = (ms: number | null) => (ms === null ? "" : formatSeconds(ms, language));

  return (
    <header style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "26px 48px 18px 56px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
        <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: "0.01em", color: WHITE }}>L&rsquo;Oréal</span>
        <span style={{ fontSize: 21, fontWeight: 500, color: WHITE_64 }}>Beauty advisor</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontVariantNumeric: "tabular-nums" }}>
        {stats.count > 0 && <Stat label="Average reply" value={seconds(stats.averageMs)} />}
        {stats.count > 0 && <Stat label="p90" value={seconds(stats.p90Ms)} />}
        <Stat label="Cost" value={`€${costEur.toFixed(3)}`} />
        <button
          type="button"
          className="ox-btn"
          onClick={replay}
          style={{ marginLeft: 8, background: BUBBLE, color: WHITE, borderRadius: 999, padding: "10px 22px", fontSize: 17, fontWeight: 600, fontFamily: "inherit" }}
        >
          Replay
        </button>
        <button
          type="button"
          className="ox-btn"
          role="switch"
          aria-checked={camera}
          onClick={toggleCamera}
          style={{ display: "flex", alignItems: "center", gap: 10, background: "transparent", color: camera ? WHITE : WHITE_64, padding: "8px 6px 8px 12px", fontSize: 16, fontWeight: 600, fontFamily: "inherit" }}
        >
          Camera
          <span style={{ position: "relative", width: 40, height: 24, borderRadius: 999, background: camera ? YELLOW : BUBBLE, transition: "background-color 200ms" }}>
            <span
              style={{
                position: "absolute",
                top: 3,
                left: camera ? 19 : 3,
                width: 18,
                height: 18,
                borderRadius: 999,
                background: camera ? "#0B0B0C" : WHITE_64,
                transition: "left 200ms, background-color 200ms",
              }}
            />
          </span>
        </button>
      </div>
    </header>
  );
}
