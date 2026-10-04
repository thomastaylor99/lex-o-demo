"use client";

import { useDemoAgent } from "@/templates/useDemoAgent";

import { Basket } from "./Basket";
import { CameraPanel } from "./CameraPanel";
import { CustomerRecord } from "./CustomerRecord";
import { Header } from "./Header";
import { Presence } from "./Presence";
import { TalkBar } from "./TalkBar";
import { BACKGROUND, EMBER_CSS, FONT, TEXT } from "./theme";
import { Transcript } from "./Transcript";

/** Round two, Ember: Studio's black and amber made calmer. Deep charcoal, frosted rounded panels, amber for the voice. */
export function EmberTemplate({ className }: { className: string }) {
  const agent = useDemoAgent();

  return (
    <div
      className={className}
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        background: BACKGROUND,
        color: TEXT,
        fontFamily: FONT,
        WebkitFontSmoothing: "antialiased",
        display: "grid",
        gridTemplateColumns: "3fr 1fr",
        gridTemplateRows: "auto minmax(0, 1fr)",
      }}
    >
      <style>{EMBER_CSS}</style>

      <Header
        language={agent.language}
        stats={agent.replyStats}
        costEur={agent.costEur}
        camera={agent.camera}
        onReplay={agent.replay}
        onToggleCamera={agent.toggleCamera}
      />

      <main style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0, minHeight: 0, padding: "16px 24px 28px 40px" }}>
        <Presence
          agent={agent.activeAgent}
          agents={agent.agents}
          activity={agent.activity}
          status={agent.status}
          language={agent.language}
        />
        <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 24 }}>
          <Transcript transcript={agent.transcript} groups={agent.productGroups} agents={agent.agents} language={agent.language} />
          {agent.camera && <CameraPanel />}
        </div>
        <TalkBar mode={agent.mode} setMode={agent.setMode} activity={agent.activity} pttDown={agent.pttDown} pttUp={agent.pttUp} />
      </main>

      <aside className="em-scroll" style={{ minWidth: 0, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 18, padding: "16px 40px 28px 16px" }}>
        <Basket basket={agent.basket} language={agent.language} />
        <CustomerRecord profile={agent.profile} language={agent.language} />
      </aside>
    </div>
  );
}
