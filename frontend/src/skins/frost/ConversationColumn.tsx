"use client";

import type { SkinProps } from "../types";
import { CameraPanel } from "./CameraPanel";
import { Island } from "./Island";
import { Relay } from "./Relay";
import { TalkBar } from "./TalkBar";
import { Transcript } from "./Transcript";

/**
 * Everything below the header on the left: the capsule with the relay beside it, the transcript
 * with its product carousels, the camera slot, the talk bar.
 */
export function ConversationColumn({ agent }: SkinProps) {
  const { agents, activeAgent, activity, status, language } = agent;

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, padding: "2px 0 18px" }}>
        <Island agents={agents} activeAgent={activeAgent} activity={activity} status={status} language={language} />
        <Relay agents={agents} activeAgent={activeAgent} />
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 24 }}>
        <Transcript transcript={agent.transcript} groups={agent.productGroups} agents={agents} language={language} />
        {agent.camera && <CameraPanel language={language} />}
      </div>
      <TalkBar
        status={status}
        mode={agent.mode}
        setMode={agent.setMode}
        activity={activity}
        language={language}
        pttDown={agent.pttDown}
        pttUp={agent.pttUp}
      />
    </div>
  );
}
