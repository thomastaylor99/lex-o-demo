"use client";

import { formatSeconds } from "@/components/i18n";
import { useDemoAgent } from "@/templates/useDemoAgent";

import { Conversation } from "./Conversation";
import { Sidebar } from "./Sidebar";
import { ATELIER_CSS, GREY, INK, SANS, SERIF } from "./styles";
import { TalkBar } from "./TalkBar";

/** Template 2, Atelier: a fashion-house lookbook. White page, black ink, a red thread for the voice. */
export function AtelierTemplate({ className }: { className: string }) {
  const agent = useDemoAgent();
  const stats = agent.replyStats;
  const s = (ms: number | null) => (ms === null ? "" : formatSeconds(ms, agent.language));

  return (
    <div className={className} style={{ position: "fixed", inset: 0, background: "#fff", color: INK, fontFamily: SANS, display: "grid", gridTemplateColumns: "3fr 1fr", gridTemplateRows: "auto 1fr" }}>
      <style>{ATELIER_CSS}</style>

      <header style={{ gridColumn: "1 / -1", display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "26px 56px", borderBottom: `1px solid ${INK}` }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 22 }}>
          <span style={{ fontFamily: SERIF, fontSize: 38 }}>L&rsquo;Oréal</span>
          <span style={{ fontSize: 16, color: GREY }}>Beauty advisor</span>
        </div>
        <div style={{ display: "flex", gap: 36, fontSize: 15, color: GREY, fontVariantNumeric: "tabular-nums" }}>
          {stats.count > 0 && (
            <span>
              Avg reply <b style={{ color: INK, fontWeight: 500 }}>{s(stats.averageMs)}</b>, range {s(stats.minMs)} to {s(stats.maxMs)}
            </span>
          )}
          <span>
            Conversation cost <b style={{ color: INK, fontWeight: 500 }}>€{agent.costEur.toFixed(3)}</b>
          </span>
          <button type="button" onClick={agent.replay} style={{ color: GREY, textDecoration: "underline", cursor: "pointer" }}>
            Replay
          </button>
        </div>
      </header>

      <main style={{ display: "flex", flexDirection: "column", minHeight: 0, padding: "32px 56px 28px" }}>
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
