"use client";

import { formatSeconds } from "@/components/i18n";
import { useDemoAgent } from "@/templates/useDemoAgent";

import { Conversation } from "./Conversation";
import { Sidebar } from "./Sidebar";
import { BLUE, BODY, CLINIC_CSS, DISPLAY, LINE, MUTED, SURFACE, TEXT } from "./styles";
import { TalkBar } from "./TalkBar";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ background: SURFACE, borderRadius: 999, padding: "8px 16px", fontSize: 15, color: MUTED }}>
      {label} <b style={{ color: TEXT, fontWeight: 600 }}>{value}</b>
    </span>
  );
}

/** Template 4, Clinic: the dermatology counter. White, cool grey surfaces, one calm blue. */
export function ClinicTemplate({ className }: { className: string }) {
  const agent = useDemoAgent();
  const stats = agent.replyStats;
  const s = (ms: number | null) => (ms === null ? "" : formatSeconds(ms, agent.language));

  return (
    <div className={className} style={{ position: "fixed", inset: 0, background: "#fff", color: TEXT, fontFamily: BODY, display: "grid", gridTemplateColumns: "3fr 1fr", gridTemplateRows: "auto 1fr" }}>
      <style>{CLINIC_CSS}</style>

      <header style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 48px", borderBottom: `1px solid ${LINE}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ width: 12, height: 12, borderRadius: 999, background: BLUE }} />
          <span style={{ fontFamily: DISPLAY, fontSize: 30 }}>L&rsquo;Oréal</span>
          <span style={{ fontSize: 16, color: MUTED }}>Skin consultation</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontVariantNumeric: "tabular-nums" }}>
          {stats.count > 0 && <Stat label="Avg reply" value={s(stats.averageMs)} />}
          {stats.count > 0 && <Stat label="p90" value={s(stats.p90Ms)} />}
          <Stat label="Cost" value={`€${agent.costEur.toFixed(3)}`} />
          <button type="button" onClick={agent.replay} style={{ marginLeft: 8, fontSize: 15, fontWeight: 600, color: BLUE, cursor: "pointer" }}>
            Replay
          </button>
        </div>
      </header>

      <main style={{ display: "flex", flexDirection: "column", minHeight: 0, padding: "28px 48px 24px" }}>
        <Conversation
          transcript={agent.transcript}
          groups={agent.productGroups}
          agents={agent.agents}
          activeAgent={agent.activeAgent}
          activity={agent.activity}
          language={agent.language}
        />
        <TalkBar mode={agent.mode} setMode={agent.setMode} activity={agent.activity} pttDown={agent.pttDown} pttUp={agent.pttUp} />
      </main>

      <Sidebar basket={agent.basket} profile={agent.profile} language={agent.language} />
    </div>
  );
}
