"use client";

import { useState } from "react";

import type { MicMode } from "@/lib/api";
import type { AgentActivity } from "@/lib/voice-agent";

import { BLUE, BLUE_TINT, BODY, LINE, MUTED, SURFACE } from "./styles";

/** Pill switch for the microphone mode, the blue hold button, and a plain hint. */
export function TalkBar({
  mode,
  setMode,
  activity,
  pttDown,
  pttUp,
}: {
  mode: MicMode;
  setMode: (mode: MicMode) => void;
  activity: AgentActivity;
  pttDown: () => void;
  pttUp: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  const release = () => {
    if (!pressed) return;
    setPressed(false);
    pttUp();
  };
  const hint =
    mode === "auto"
      ? activity === "listening"
        ? "Listening, just speak"
        : "One moment"
      : pressed
        ? "Release when you are done"
        : "Hold to talk, or hold the space bar";

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${LINE}`, paddingTop: 18, fontFamily: BODY }}>
      <div style={{ display: "flex", background: SURFACE, borderRadius: 999, padding: 4 }}>
        {(["auto", "push_to_talk"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            style={{ fontSize: 15, fontWeight: 600, padding: "9px 18px", borderRadius: 999, background: mode === option ? BLUE : "transparent", color: mode === option ? "#fff" : MUTED, cursor: "pointer", transition: "all 200ms" }}
          >
            {option === "auto" ? "Hands-free" : "Hold to talk"}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 15, color: MUTED }}>{hint}</span>
        {mode === "push_to_talk" && (
          <button
            type="button"
            aria-label="Hold to talk"
            onPointerDown={() => {
              setPressed(true);
              pttDown();
            }}
            onPointerUp={release}
            onPointerLeave={release}
            style={{ width: 64, height: 64, borderRadius: 999, background: pressed ? BLUE : BLUE_TINT, display: "grid", placeItems: "center", cursor: "pointer", transition: "all 200ms", transform: pressed ? "scale(1.06)" : "none" }}
          >
            <span style={{ width: 16, height: 24, borderRadius: 8, border: `2.5px solid ${pressed ? "#fff" : BLUE}` }} />
          </button>
        )}
        {mode === "auto" && (
          <span style={{ width: 12, height: 12, borderRadius: 999, background: activity === "listening" ? BLUE : LINE, animation: activity === "listening" ? "cl-breathe 2.4s ease-in-out infinite" : undefined }} />
        )}
      </div>
    </div>
  );
}
