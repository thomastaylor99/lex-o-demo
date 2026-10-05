"use client";

import { CameraPanel } from "@/skins/frost/CameraPanel";
import { Transcript } from "@/skins/frost/Transcript";
import type { SkinProps } from "@/skins/types";

import { QuietTalkBar } from "../QuietTalkBar";
import { BreathingIsland } from "./BreathingIsland";

/**
 * Below the header: the island floats, centred, over the top of the conversation, which scrolls under
 * it; then the talk bar. The island takes no room of its own.
 */
export function IslandColumn({ agent }: SkinProps) {
  const { language } = agent;
  return (
    <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ position: "absolute", top: 6, left: 0, right: 0, zIndex: 2, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
        <BreathingIsland agents={agent.agents} activeAgent={agent.activeAgent} activity={agent.activity} status={agent.status} language={language} />
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 24 }}>
        {/* The voice lives in this template's own bar, so the conversation lines stay quiet (idle). */}
        <Transcript transcript={agent.transcript} groups={agent.productGroups} agents={agent.agents} language={language} tutorialGroups={agent.tutorialGroups} recap={agent.recap} activeAgent={agent.activeAgent} activity="idle" />
        {agent.camera && <CameraPanel language={language} />}
      </div>
      <QuietTalkBar status={agent.status} mode={agent.mode} setMode={agent.setMode} language={language} pttDown={agent.pttDown} pttUp={agent.pttUp} />
    </div>
  );
}
