"use client";

import { useState } from "react";

import type { MicMode } from "@/lib/api";
import type { AgentActivity } from "@/lib/voice-agent";

import { GREY, INK, LIGHT, RED, SANS } from "./styles";

/** Hands-free or hold-to-talk, the hold button, and what the advisor is doing. */
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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${INK}`, paddingTop: 20 }}>
      <div style={{ display: "flex", border: `1px solid ${INK}` }}>
        {(["auto", "push_to_talk"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            style={{ fontFamily: SANS, fontSize: 15, padding: "10px 18px", background: mode === option ? INK : "#fff", color: mode === option ? "#fff" : INK, cursor: "pointer" }}
          >
            {option === "auto" ? "Hands-free" : "Hold to talk"}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <span style={{ fontFamily: SANS, fontSize: 15, color: GREY }}>{hint}</span>
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
            style={{ width: 64, height: 64, borderRadius: 999, border: `1.5px solid ${pressed ? RED : INK}`, background: pressed ? RED : "#fff", display: "grid", placeItems: "center", cursor: "pointer", transition: "all 200ms" }}
          >
            <span style={{ width: 3, height: 22, borderRadius: 2, background: pressed ? "#fff" : INK }} />
          </button>
        )}
        {mode === "auto" && (
          <span style={{ width: 10, height: 10, borderRadius: 999, background: activity === "listening" ? RED : LIGHT, animation: activity === "listening" ? "at-breathe 2.4s ease-in-out infinite" : undefined }} />
        )}
      </div>
    </div>
  );
}
