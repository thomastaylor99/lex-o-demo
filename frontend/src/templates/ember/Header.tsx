import { formatSeconds } from "@/components/i18n";
import type { Language } from "@/lib/events";
import type { ReplyStats } from "@/lib/voice-agent";

import { AMBER, FAINT, MUTED, ON_AMBER, TEXT, glass } from "./theme";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ ...glass(999), display: "flex", alignItems: "baseline", gap: 8, padding: "9px 18px", fontVariantNumeric: "tabular-nums" }}>
      <span style={{ fontSize: 15, color: FAINT }}>{label}</span>
      <span style={{ fontSize: 17, fontWeight: 700, color: TEXT }}>{value}</span>
    </span>
  );
}

/** Wordmark on the left; reply times, running cost, replay and the camera preview toggle on the right. */
export function Header({
  language,
  stats,
  costEur,
  camera,
  onReplay,
  onToggleCamera,
}: {
  language: Language;
  stats: ReplyStats;
  costEur: number;
  camera: boolean;
  onReplay: () => void;
  onToggleCamera: () => void;
}) {
  const seconds = (ms: number | null) => (ms === null ? "" : formatSeconds(ms, language));

  return (
    <header style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 40px 8px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
        <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", color: TEXT }}>L&rsquo;Oréal</span>
        <span style={{ fontSize: 19, fontWeight: 500, color: MUTED }}>Beauty advisor</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {stats.count > 0 && <Stat label="Average reply" value={seconds(stats.averageMs)} />}
        {stats.count > 0 && <Stat label="p90" value={seconds(stats.p90Ms)} />}
        <Stat label="Cost" value={`€${costEur.toFixed(3)}`} />

        <button
          type="button"
          onClick={onReplay}
          className="em-press"
          style={{ ...glass(999), display: "flex", alignItems: "center", gap: 8, padding: "9px 18px", marginLeft: 6, fontSize: 16, fontWeight: 600, color: TEXT, cursor: "pointer" }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
          </svg>
          Replay
        </button>

        <button
          type="button"
          onClick={onToggleCamera}
          aria-pressed={camera}
          className="em-press"
          style={{ ...glass(999), display: "flex", alignItems: "center", gap: 10, padding: "7px 8px 7px 16px", fontSize: 15, fontWeight: 600, color: camera ? TEXT : MUTED, cursor: "pointer" }}
        >
          Camera
          <span style={{ position: "relative", width: 40, height: 24, borderRadius: 999, background: camera ? AMBER : "rgba(255, 255, 255, 0.14)", transition: "background-color 200ms ease" }}>
            <span
              style={{ position: "absolute", top: 3, left: camera ? 19 : 3, width: 18, height: 18, borderRadius: 999, background: camera ? ON_AMBER : TEXT, transition: "left 200ms ease" }}
            />
          </span>
        </button>
      </div>
    </header>
  );
}
