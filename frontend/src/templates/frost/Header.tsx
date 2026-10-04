import { formatSeconds } from "@/components/i18n";
import type { Language } from "@/lib/events";
import type { ReplyStats } from "@/lib/voice-agent";

import { ReplayIcon } from "./icons";
import { BUBBLE, INK, MUTED, ON_DARK_MUTED, TRACK, YELLOW } from "./theme";

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <span
      className="fr-pop"
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 8,
        borderRadius: 999,
        padding: "10px 18px",
        background: INK,
        color: "#fff",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <span style={{ fontSize: 15, color: ON_DARK_MUTED }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 600 }}>{value}</span>
    </span>
  );
}

/** A small switch that previews the V2 camera slot. */
function CameraToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className="fr-press"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        borderRadius: 999,
        padding: "8px 9px 8px 16px",
        background: BUBBLE,
        color: INK,
        fontSize: 15,
        fontWeight: 500,
        cursor: "pointer",
      }}
    >
      Camera
      <span style={{ position: "relative", width: 36, height: 22, borderRadius: 999, background: on ? INK : TRACK, transition: "background-color 220ms" }}>
        <span
          style={{
            position: "absolute",
            top: 3,
            left: on ? 17 : 3,
            width: 16,
            height: 16,
            borderRadius: 999,
            background: on ? YELLOW : "#fff",
            transition: "left 220ms, background-color 220ms",
          }}
        />
      </span>
    </button>
  );
}

/** Wordmark on the left; reply-time and cost pills, Replay and the camera switch on the right. */
export function Header(props: {
  language: Language;
  stats: ReplyStats;
  costEur: number;
  onReplay: () => void;
  camera: boolean;
  onToggleCamera: () => void;
}) {
  const { language, stats, costEur, onReplay, camera, onToggleCamera } = props;
  const seconds = (ms: number | null) => (ms === null ? "" : formatSeconds(ms, language));

  return (
    <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, padding: "28px 0 18px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
        <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.035em", color: INK }}>L&rsquo;Oréal</span>
        <span style={{ fontSize: 20, color: MUTED }}>Beauty advisor</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {stats.count > 0 && <StatPill label="Avg reply" value={seconds(stats.averageMs)} />}
        {stats.count > 0 && <StatPill label="p90" value={seconds(stats.p90Ms)} />}
        <StatPill label="Cost" value={`€${costEur.toFixed(3)}`} />
        <button
          type="button"
          onClick={onReplay}
          className="fr-press"
          style={{
            marginLeft: 14,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            borderRadius: 999,
            padding: "11px 20px",
            background: INK,
            color: "#fff",
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <ReplayIcon />
          Replay
        </button>
        <CameraToggle on={camera} onToggle={onToggleCamera} />
      </div>
    </header>
  );
}
