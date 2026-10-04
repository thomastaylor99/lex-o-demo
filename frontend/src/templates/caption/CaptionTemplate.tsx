"use client";

import { formatSeconds } from "@/components/i18n";
import { useDemoAgent } from "@/templates/useDemoAgent";
import type { AgentActivity } from "@/lib/voice-agent";

import { Captions } from "./Captions";
import { Sidebar } from "./Sidebar";
import { BLACK, CAPTION_CSS, DISPLAY, GREY, MONO, NARROW, RULE, YELLOW } from "./styles";
import { TalkBar } from "./TalkBar";

const ACTIVITY: Record<AgentActivity, string> = { idle: "ready", listening: "listening", thinking: "thinking", speaking: "speaking" };

/** Template 5, Caption: broadcast subtitles in black and white, with an inverted sidebar. */
export function CaptionTemplate({ className }: { className: string }) {
  const agent = useDemoAgent();
  const stats = agent.replyStats;
  const s = (ms: number | null) => (ms === null ? "" : formatSeconds(ms, agent.language));
  const live = agent.activity === "speaking" || agent.activity === "listening";

  return (
    <div className={className} style={{ position: "fixed", inset: 0, background: "#fff", color: BLACK, display: "grid", gridTemplateColumns: "3fr 1fr" }}>
      <style>{CAPTION_CSS}</style>

      <main style={{ display: "flex", flexDirection: "column", minHeight: 0, padding: "26px 52px 26px" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 18, borderBottom: `1px solid ${RULE}`, fontFamily: MONO, fontSize: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <span style={{ fontFamily: DISPLAY, fontVariationSettings: NARROW, fontWeight: 700, fontSize: 30, letterSpacing: "-0.01em" }}>L&rsquo;Oréal</span>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 12, height: 12, borderRadius: 999, background: live ? YELLOW : RULE, boxShadow: `0 0 0 2px ${BLACK}`, animation: live ? "cp-live 1.4s ease-in-out infinite" : undefined }} />
              <span key={agent.activeAgent?.id} className="cp-fade">
                {agent.activeAgent?.displayName}, {ACTIVITY[agent.activity]}
              </span>
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 26, color: GREY }}>
            {stats.count > 0 && (
              <span>
                avg reply <b style={{ color: BLACK, fontWeight: 500 }}>{s(stats.averageMs)}</b>, p90 <b style={{ color: BLACK, fontWeight: 500 }}>{s(stats.p90Ms)}</b>
              </span>
            )}
            <span>
              cost <b style={{ color: BLACK, fontWeight: 500 }}>€{agent.costEur.toFixed(3)}</b>
            </span>
            <button type="button" onClick={agent.replay} style={{ color: BLACK, textDecoration: "underline", cursor: "pointer" }}>
              replay
            </button>
          </div>
        </header>

        <Captions transcript={agent.transcript} groups={agent.productGroups} agents={agent.agents} language={agent.language} />
        <TalkBar mode={agent.mode} setMode={agent.setMode} activity={agent.activity} pttDown={agent.pttDown} pttUp={agent.pttUp} />
      </main>

      <Sidebar basket={agent.basket} profile={agent.profile} language={agent.language} />
    </div>
  );
}
