"use client";

import { useDemoAgent } from "@/templates/useDemoAgent";

import { CameraPanel } from "./CameraPanel";
import { Header } from "./Header";
import { Presence } from "./Presence";
import { SidePanel } from "./SidePanel";
import { BG, FONT, ONYX_CSS, WHITE } from "./styles";
import { TalkBar } from "./TalkBar";
import { Transcript } from "./Transcript";

/** Onyx: pure black, golden yellow voice orb, confident white type. Conversation left, record right. */
export function OnyxTemplate({ className }: { className: string }) {
  const agent = useDemoAgent();

  return (
    <div
      className={className}
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        background: BG,
        color: WHITE,
        fontFamily: FONT,
        display: "grid",
        gridTemplateColumns: "minmax(0, 3fr) minmax(0, 1fr)",
        gridTemplateRows: "auto minmax(0, 1fr)",
      }}
    >
      <style>{ONYX_CSS}</style>

      <Header
        language={agent.language}
        stats={agent.replyStats}
        costEur={agent.costEur}
        camera={agent.camera}
        replay={agent.replay}
        toggleCamera={agent.toggleCamera}
      />

      <main style={{ display: "flex", flexDirection: "column", minHeight: 0, padding: "0 56px 28px" }}>
        <Presence agent={agent.activeAgent} activity={agent.activity} status={agent.status} language={agent.language} />
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: agent.camera ? "minmax(0, 1fr) 400px" : "minmax(0, 1fr)",
            gridTemplateRows: "minmax(0, 1fr)",
            gap: 40,
          }}
        >
          <Transcript transcript={agent.transcript} groups={agent.productGroups} agents={agent.agents} language={agent.language} />
          {agent.camera && <CameraPanel />}
        </div>
        <TalkBar
          mode={agent.mode}
          setMode={agent.setMode}
          activity={agent.activity}
          pttDown={agent.pttDown}
          pttUp={agent.pttUp}
          language={agent.language}
        />
      </main>

      <SidePanel basket={agent.basket} profile={agent.profile} language={agent.language} />
    </div>
  );
}
