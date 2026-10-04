"use client";

import { useDemoAgent } from "@/templates/useDemoAgent";

import { CameraPanel } from "./CameraPanel";
import { Conversation } from "./Conversation";
import { Header } from "./Header";
import { Presence } from "./Presence";
import { SidePanel } from "./SidePanel";
import { DUO_CSS, FONT, TEXT } from "./styles";
import { TalkBar } from "./TalkBar";

/**
 * Duo: a two-sided story. The visitor's conversation on the left, light; L'Oréal's side on the
 * right, dark: what the brand learns while the visitor talks. One amber accent runs across both.
 */
export function DuoTemplate({ className }: { className: string }) {
  const agent = useDemoAgent();

  return (
    <div
      className={className}
      lang={agent.language}
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: "minmax(0, 3fr) minmax(0, 1fr)",
        gridTemplateRows: "minmax(0, 1fr)",
        background: "#fff",
        color: TEXT,
        fontFamily: FONT,
      }}
    >
      <style>{DUO_CSS}</style>

      <main style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
        <Header camera={agent.camera} toggleCamera={agent.toggleCamera} replay={agent.replay} />
        <Presence agents={agent.agents} activeAgent={agent.activeAgent} activity={agent.activity} language={agent.language} />
        <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 32, padding: "0 48px" }}>
          <Conversation transcript={agent.transcript} groups={agent.productGroups} agents={agent.agents} language={agent.language} />
          {agent.camera && <CameraPanel />}
        </div>
        <TalkBar mode={agent.mode} setMode={agent.setMode} activity={agent.activity} pttDown={agent.pttDown} pttUp={agent.pttUp} />
      </main>

      <SidePanel basket={agent.basket} profile={agent.profile} replyStats={agent.replyStats} costEur={agent.costEur} language={agent.language} />
    </div>
  );
}
