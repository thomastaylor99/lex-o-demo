import type { ReactNode } from "react";

import { formatCost, formatSeconds, labels } from "@/components/i18n";
import { Wordmark } from "@/skins/frost/Header";
import { ReplayIcon } from "@/skins/frost/icons";
import { BUBBLE, fs, INK, MUTED, TRACK } from "@/skins/frost/theme";
import type { SkinProps } from "@/skins/types";

/** A stat on a light grey pill: the label muted, the value in ink. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span
      className="fr-pop"
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 7,
        borderRadius: 999,
        padding: "8px 15px",
        background: BUBBLE,
        whiteSpace: "nowrap",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <span style={{ fontSize: fs(15), color: MUTED }}>{label}</span>
      <span style={{ fontSize: fs(18), fontWeight: 600, color: INK }}>{value}</span>
    </span>
  );
}

/**
 * The Frost header with the black taken out, shared by the voice-bar templates: the wordmark, a slot
 * for a voice element, then reply times, cost and Restart on light pills.
 */
export function QuietHeader({ agent, children }: SkinProps & { children?: ReactNode }) {
  const { language, replyStats: stats, costEur, restart } = agent;
  const l = labels(language);
  const seconds = (ms: number | null) => (ms === null ? "" : formatSeconds(ms, language));

  return (
    <header style={{ display: "flex", alignItems: "center", gap: 20, padding: "22px 0 14px" }}>
      <Wordmark advisor={l.advisor} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center" }}>{children}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {stats.count > 0 && <Stat label={l.avgReply} value={seconds(stats.averageMs)} />}
        {stats.count > 0 && <Stat label={l.p90} value={seconds(stats.p90Ms)} />}
        <Stat label={l.cost} value={formatCost(costEur, language)} />
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
      </div>
    </header>
  );
}
