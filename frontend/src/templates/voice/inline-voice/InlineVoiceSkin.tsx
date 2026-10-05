"use client";

import { CameraPanel } from "@/skins/frost/CameraPanel";
import { FROST_CSS } from "@/skins/frost/css";
import { ErrorBanner } from "@/skins/frost/ErrorBanner";
import { SidePanel } from "@/skins/frost/SidePanel";
import { FONT, INK } from "@/skins/frost/theme";
import { Welcome } from "@/skins/frost/Welcome";
import type { SkinProps } from "@/skins/types";

import { QuietHeader } from "../QuietHeader";
import { QuietTalkBar } from "../QuietTalkBar";
import { INLINE_VOICE_CSS } from "./css";
import { InlineVoiceTranscript } from "./Transcript";

/**
 * Frost with no voice bar: the voice lives on the lines of the conversation (the label of the line
 * being spoken, a waiting bubble while the microphone listens, the handover as a moment). The header
 * keeps the stats and Restart; the talk bar keeps only the microphone mode and the hold button.
 */
export function InlineVoiceSkin({ agent }: SkinProps) {
  const { status } = agent;
  const welcome = status === "idle" || status === "starting" || (status === "error" && agent.transcript.length === 0);

  return (
    <div
      lang={agent.language}
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        gridTemplateColumns: welcome ? "minmax(0, 1fr)" : "minmax(0, 3fr) minmax(0, 1fr)",
        gridTemplateRows: "minmax(0, 1fr)",
        overflow: "hidden",
        background: "#fff",
        color: INK,
        fontFamily: FONT,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <style>{FROST_CSS}</style>
      <style>{INLINE_VOICE_CSS}</style>
      {welcome ? (
        <Welcome agent={agent} />
      ) : (
        <>
          <main style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, padding: "0 56px 28px" }}>
            <QuietHeader agent={agent} />
            <ErrorBanner agent={agent} />
            <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 24 }}>
              <InlineVoiceTranscript agent={agent} />
              {agent.camera && <CameraPanel language={agent.language} />}
            </div>
            <QuietTalkBar
              status={status}
              mode={agent.mode}
              setMode={agent.setMode}
              language={agent.language}
              pttDown={agent.pttDown}
              pttUp={agent.pttUp}
            />
          </main>
          <SidePanel agent={agent} />
        </>
      )}
    </div>
  );
}
