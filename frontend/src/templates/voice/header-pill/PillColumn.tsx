"use client";

import { CameraPanel } from "@/skins/frost/CameraPanel";
import { Transcript } from "@/skins/frost/Transcript";
import type { SkinProps } from "@/skins/types";

import { QuietTalkBar } from "../QuietTalkBar";

/** Below the header: the transcript (and the camera slot), then the talk bar. No capsule, no relay row. */
export function PillColumn({ agent }: SkinProps) {
  const { language } = agent;
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 24 }}>
        {/* The voice lives in this template's own bar, so the conversation lines stay quiet (idle). */}
        <Transcript transcript={agent.transcript} groups={agent.productGroups} agents={agent.agents} language={language} tutorialGroups={agent.tutorialGroups} recap={agent.recap} activeAgent={agent.activeAgent} activity="idle" />
        {agent.camera && <CameraPanel language={language} />}
      </div>
      <QuietTalkBar status={agent.status} mode={agent.mode} setMode={agent.setMode} language={language} pttDown={agent.pttDown} pttUp={agent.pttUp} />
    </div>
  );
}
