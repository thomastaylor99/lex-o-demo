"use client";

import { formatSeconds } from "@/components/i18n";
import { useDemoAgent } from "@/templates/useDemoAgent";

import { Conversation } from "./Conversation";
import { Sidebar } from "./Sidebar";
import { BACKGROUND, BODY, CHAMPAGNE, DISPLAY, FAINT, HAIRLINE, IVORY, MUTED, NOIR_CSS } from "./styles";
import { TalkBar } from "./TalkBar";

/** Template 1, Noir: an evening boutique. Near-black, ivory type, a champagne orb for the voice. */
export function NoirTemplate({ className }: { className: string }) {
  const agent = useDemoAgent();
  const stats = agent.replyStats;
  const s = (ms: number | null) => (ms === null ? "" : formatSeconds(ms, agent.language));

  return (
    <div className={className} style={{ position: "fixed", inset: 0, background: BACKGROUND, color: IVORY, fontFamily: BODY, display: "grid", gridTemplateColumns: "3fr 1fr", gridTemplateRows: "auto 1fr" }}>
      <style>{NOIR_CSS}</style>

      <header style={{ gridColumn: "1 / -1", display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "24px 56px", borderBottom: `1px solid ${HAIRLINE}` }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
          <span style={{ fontFamily: DISPLAY, fontSize: 36, letterSpacing: "0.04em" }}>L&rsquo;Oréal</span>
          <span style={{ fontSize: 15, letterSpacing: "0.08em", color: CHAMPAGNE }}>Beauty advisor</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 34, fontSize: 14, color: MUTED, fontVariantNumeric: "tabular-nums" }}>
          {stats.count > 0 && (
            <span>
              Avg reply <b style={{ color: IVORY, fontWeight: 500 }}>{s(stats.averageMs)}</b>
              <span style={{ color: FAINT }}>, range {s(stats.minMs)} to {s(stats.maxMs)}</span>
            </span>
          )}
          <span>
            Conversation cost <b style={{ color: IVORY, fontWeight: 500 }}>€{agent.costEur.toFixed(3)}</b>
          </span>
          <button type="button" onClick={agent.replay} style={{ color: CHAMPAGNE, cursor: "pointer" }}>
            Replay
          </button>
        </div>
      </header>

      <main style={{ display: "flex", flexDirection: "column", minHeight: 0, padding: "30px 56px 26px" }}>
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
