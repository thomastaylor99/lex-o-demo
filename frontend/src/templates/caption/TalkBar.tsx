"use client";

import { useState } from "react";

import type { MicMode } from "@/lib/api";
import type { AgentActivity } from "@/lib/voice-agent";

import { BLACK, GREY, MONO, RULE, YELLOW } from "./styles";

/** Square black-and-white controls; the hold button turns yellow while the visitor speaks. */
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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `2px solid ${BLACK}`, paddingTop: 18, fontFamily: MONO }}>
      <div style={{ display: "flex", border: `2px solid ${BLACK}` }}>
        {(["auto", "push_to_talk"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            style={{ fontSize: 14, padding: "10px 16px", background: mode === option ? BLACK : "#fff", color: mode === option ? "#fff" : BLACK, cursor: "pointer" }}
          >
            {option === "auto" ? "Hands-free" : "Hold to talk"}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 14, color: GREY }}>{hint}</span>
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
            style={{ width: 64, height: 64, border: `2px solid ${BLACK}`, background: pressed ? YELLOW : "#fff", display: "grid", placeItems: "center", cursor: "pointer", transition: "background 150ms" }}
          >
            <span style={{ width: 14, height: 22, borderRadius: 7, background: BLACK }} />
          </button>
        )}
        {mode === "auto" && (
          <span style={{ width: 14, height: 14, borderRadius: 999, background: activity === "listening" ? YELLOW : RULE, boxShadow: activity === "listening" ? `0 0 0 2px ${BLACK}` : "none", animation: activity === "listening" ? "cp-live 1.6s ease-in-out infinite" : undefined }} />
        )}
      </div>
    </div>
  );
}
