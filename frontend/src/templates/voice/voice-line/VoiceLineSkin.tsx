"use client";

import type { AgentActivity } from "@/lib/voice-agent";
import { CameraPanel } from "@/skins/frost/CameraPanel";
import { FROST_CSS } from "@/skins/frost/css";
import { ErrorBanner } from "@/skins/frost/ErrorBanner";
import { SidePanel } from "@/skins/frost/SidePanel";
import { FONT, INK } from "@/skins/frost/theme";
import { Transcript } from "@/skins/frost/Transcript";
import { Welcome } from "@/skins/frost/Welcome";
import type { SkinProps } from "@/skins/types";

import { QuietHeader } from "../QuietHeader";
import { QuietTalkBar } from "../QuietTalkBar";
import { VOICE_LINE_CSS } from "./css";
import { VoiceLinePresence } from "./VoiceLinePresence";
import { VoiceLineWave } from "./VoiceLineWave";

/**
 * Voice line: no bar. Who speaks sits in the header after the wordmark; the header's divider is the
 * voice itself, a hairline that becomes a gold waveform, a grey swell or a travelling light. The
 * transcript, cards, side panel and welcome screen are Frost's.
 */
export function VoiceLineSkin({ agent }: SkinProps) {
  const { status, agents, activeAgent, activity, language, transcript } = agent;
  const welcome = status === "idle" || status === "starting" || (status === "error" && transcript.length === 0);
  const mode: AgentActivity = status === "live" ? activity : "idle";
  const last = transcript[transcript.length - 1];
  const visitorTalking = mode === "listening" && last?.kind === "visitor" && !last.final;

  return (
    <div
      lang={language}
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        gridTemplateColumns: welcome ? "minmax(0, 1fr)" : "minmax(0, 3fr) minmax(0, 1fr)",
        gridTemplateRows: "minmax(0, 1fr)",
        overflow: "hidden",
        background: "#fff",
        color: INK,
        fontFamily: FONT,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <style>{FROST_CSS}</style>
      <style>{VOICE_LINE_CSS}</style>
      {welcome ? (
        <Welcome agent={agent} />
      ) : (
        <>
          <main style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, padding: "0 56px 28px" }}>
            <QuietHeader agent={agent}>
              <VoiceLinePresence agents={agents} activeAgent={activeAgent} mode={mode} language={language} />
            </QuietHeader>
            <VoiceLineWave agents={agents} activeAgent={activeAgent} mode={mode} visitorTalking={visitorTalking} />
            <ErrorBanner agent={agent} />
            <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 24 }}>
              {/* The voice lives in this template's own bar, so the conversation lines stay quiet (idle). */}
              <Transcript transcript={transcript} groups={agent.productGroups} agents={agents} language={language} tutorialGroups={agent.tutorialGroups} recap={agent.recap} activeAgent={agent.activeAgent} activity="idle" />
              {agent.camera && <CameraPanel language={language} />}
            </div>
            <QuietTalkBar
              status={status}
              mode={agent.mode}
              setMode={agent.setMode}
              language={language}
              pttDown={agent.pttDown}
              pttUp={agent.pttUp}
            />
          </main>
          <SidePanel agent={agent} />
        </>
      )}
    </div>
  );
}
