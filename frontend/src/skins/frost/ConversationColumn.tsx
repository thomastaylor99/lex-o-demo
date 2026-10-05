"use client";

import type { SkinProps } from "../types";
import { CameraPanel } from "./CameraPanel";
import { EmailField } from "./EmailField";
import { TalkBar } from "./TalkBar";
import { Transcript } from "./Transcript";

/**
 * Everything below the header on the left: the conversation, which carries the voice on its lines,
 * with its products, tutorials and recap; the camera slot; the email field once the visitor agreed
 * to save their profile; the talk bar.
 */
export function ConversationColumn({ agent }: SkinProps) {
  const { status, language } = agent;

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 24 }}>
        <Transcript
          transcript={agent.transcript}
          groups={agent.productGroups}
          tutorialGroups={agent.tutorialGroups}
          recap={agent.recap}
          agents={agent.agents}
          activeAgent={agent.activeAgent}
          activity={status === "live" ? agent.activity : "idle"}
          language={language}
        />
        {agent.camera && <CameraPanel language={language} />}
      </div>
      <EmailField agent={agent} />
      <TalkBar status={status} mode={agent.mode} setMode={agent.setMode} language={language} pttDown={agent.pttDown} pttUp={agent.pttUp} />
    </div>
  );
}
