"use client";

import { useDemoAgent } from "@/templates/useDemoAgent";

import { Basket } from "./Basket";
import { CameraPanel } from "./CameraPanel";
import { Conversation } from "./Conversation";
import { CustomerRecord } from "./CustomerRecord";
import { LUMEN_CSS } from "./css";
import { Header } from "./Header";
import { Presence } from "./Presence";
import { TalkBar } from "./TalkBar";
import { BODY, SURFACE, TEXT, WHITE } from "./theme";

/** Lumen: Clinic's white counter and rounded cards, amber as the single accent, a touch of Studio's life. */
export function LumenTemplate({ className }: { className: string }) {
  const agent = useDemoAgent();
  const basketIds = new Set(agent.basket.items.map((item) => item.product_id));

  return (
    <div
      className={className}
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        gridTemplateColumns: "minmax(0, 3fr) minmax(0, 1fr)",
        gridTemplateRows: "auto minmax(0, 1fr)",
        background: WHITE,
        color: TEXT,
        fontFamily: BODY,
      }}
    >
      <style>{LUMEN_CSS}</style>
      <Header agent={agent} />

      <main style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, padding: "26px 48px 24px" }}>
        <Presence agents={agent.agents} activeAgent={agent.activeAgent} activity={agent.activity} language={agent.language} />
        <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 28 }}>
          <Conversation
            transcript={agent.transcript}
            groups={agent.productGroups}
            agents={agent.agents}
            basketIds={basketIds}
            language={agent.language}
            visitorLabel="You"
          />
          {agent.camera && <CameraPanel />}
        </div>
        <TalkBar mode={agent.mode} setMode={agent.setMode} activity={agent.activity} pttDown={agent.pttDown} pttUp={agent.pttUp} />
      </main>

      <aside
        className="lm-scroll"
        style={{ display: "flex", flexDirection: "column", gap: 20, minHeight: 0, overflowY: "auto", padding: 28, background: SURFACE }}
      >
        <Basket basket={agent.basket} language={agent.language} />
        <CustomerRecord profile={agent.profile} language={agent.language} />
      </aside>
    </div>
  );
}
