import { formatSeconds } from "@/components/i18n";
import type { Language } from "@/lib/events";
import type { ReplyStats } from "@/lib/voice-agent";

import { AMBER, darkCard, ON_DARK, ON_DARK_MUTED } from "./styles";

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ minWidth: 0 }}>
      <p style={{ fontSize: 14, fontWeight: 600, color: ON_DARK_MUTED }}>{label}</p>
      <p key={value} className="du-fade" style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.01em", color: accent ? AMBER : ON_DARK, fontVariantNumeric: "tabular-nums", marginTop: 2 }}>
        {value}
      </p>
    </div>
  );
}

/** The top of L'Oréal's side: the title, then reply speed and the running cost of this conversation. */
export function PanelHeader({ replyStats, costEur, language }: { replyStats: ReplyStats; costEur: number; language: Language }) {
  const seconds = (ms: number | null) => (ms === null ? "" : formatSeconds(ms, language));
  const replied = replyStats.count > 0;

  return (
    <div style={{ flex: "none" }}>
      <div style={{ height: 68, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <p style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: ON_DARK }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: AMBER, boxShadow: "0 0 12px rgba(255, 154, 60, 0.7)" }} />
          L&rsquo;Oréal view
        </p>
        <p style={{ fontSize: 15, color: ON_DARK_MUTED, marginTop: 2, paddingLeft: 20 }}>What the brand learns as the visitor talks</p>
      </div>

      <div style={{ ...darkCard, marginTop: 14, padding: "16px 22px", display: "grid", gridTemplateColumns: replied ? "1.2fr 1fr 1fr" : "1fr", gap: 12 }}>
        {replied && <Stat label="Avg reply" value={seconds(replyStats.averageMs)} />}
        {replied && <Stat label="p90" value={seconds(replyStats.p90Ms)} />}
        <Stat label="Cost so far" value={`€${costEur.toFixed(3)}`} accent />
      </div>
    </div>
  );
}
