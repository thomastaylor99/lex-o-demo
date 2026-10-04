"use client";

import { useDemoAgent } from "@/templates/useDemoAgent";

import { Basket } from "./Basket";
import { CameraPanel } from "./CameraPanel";
import { FROST_CSS } from "./css";
import { CustomerRecord } from "./CustomerRecord";
import { Header } from "./Header";
import { Island } from "./Island";
import { TalkBar } from "./TalkBar";
import { FONT, INK, SURFACE } from "./theme";
import { Transcript } from "./Transcript";

/** Frost: a white screen, cool grey surfaces, black pills and a yellow voice. */
export function FrostTemplate({ className }: { className: string }) {
  const agent = useDemoAgent();

  return (
    <div
      className={className}
      lang={agent.language}
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        gridTemplateColumns: "3fr 1fr",
        gridTemplateRows: "minmax(0, 1fr)",
        overflow: "hidden",
        background: "#fff",
        color: INK,
        fontFamily: FONT,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <style>{FROST_CSS}</style>

      <main style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, padding: "0 56px 28px" }}>
        <Header
          language={agent.language}
          stats={agent.replyStats}
          costEur={agent.costEur}
          onReplay={agent.replay}
          camera={agent.camera}
          onToggleCamera={agent.toggleCamera}
        />
        <Island agents={agent.agents} activeAgent={agent.activeAgent} activity={agent.activity} status={agent.status} />
        <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 28 }}>
          <Transcript transcript={agent.transcript} groups={agent.productGroups} agents={agent.agents} language={agent.language} />
          {agent.camera && <CameraPanel />}
        </div>
        <TalkBar mode={agent.mode} setMode={agent.setMode} activity={agent.activity} pttDown={agent.pttDown} pttUp={agent.pttUp} />
      </main>

      <aside className="fr-scroll" style={{ display: "flex", flexDirection: "column", gap: 20, minHeight: 0, overflowY: "auto", padding: 28, background: SURFACE }}>
        <Basket basket={agent.basket} language={agent.language} />
        <CustomerRecord profile={agent.profile} language={agent.language} />
      </aside>
    </div>
  );
}
