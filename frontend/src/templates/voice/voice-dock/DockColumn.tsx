"use client";

import { CameraPanel } from "@/skins/frost/CameraPanel";
import { Transcript } from "@/skins/frost/Transcript";
import type { SkinProps } from "@/skins/types";

import { VoiceDock } from "./VoiceDock";

/**
 * Everything below the header on the left: the transcript with its product carousels, now up to
 * the header, the camera slot, then the voice dock in place of the talk bar.
 */
export function DockColumn({ agent }: SkinProps) {
  const { agents, language } = agent;

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 24 }}>
        {/* The voice lives in this template's own bar, so the conversation lines stay quiet (idle). */}
        <Transcript transcript={agent.transcript} groups={agent.productGroups} agents={agents} language={language} tutorialGroups={agent.tutorialGroups} recap={agent.recap} activeAgent={agent.activeAgent} activity="idle" />
        {agent.camera && <CameraPanel language={language} />}
      </div>
      <VoiceDock agent={agent} />
    </div>
  );
}
