"use client";

import { useState } from "react";

import type { MicMode } from "@/lib/api";
import type { AgentActivity } from "@/lib/voice-agent";

import { BODY, CHAMPAGNE, CHAMPAGNE_LINE, FAINT, HAIRLINE, MUTED } from "./styles";

/** Quiet controls: a hairline switch, and a champagne ring to hold while speaking. */
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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${HAIRLINE}`, paddingTop: 20, fontFamily: BODY }}>
      <div style={{ display: "flex", border: `1px solid ${CHAMPAGNE_LINE}`, borderRadius: 999, padding: 3 }}>
        {(["auto", "push_to_talk"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            style={{ fontSize: 14, letterSpacing: "0.04em", padding: "8px 18px", borderRadius: 999, background: mode === option ? CHAMPAGNE : "transparent", color: mode === option ? "#0B0B0C" : MUTED, cursor: "pointer", transition: "all 250ms" }}
          >
            {option === "auto" ? "Hands-free" : "Hold to talk"}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <span style={{ fontSize: 15, color: FAINT }}>{hint}</span>
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
            style={{ width: 66, height: 66, borderRadius: 999, border: `1.5px solid ${CHAMPAGNE}`, background: pressed ? CHAMPAGNE : "transparent", boxShadow: pressed ? "0 0 36px 8px rgba(201, 169, 110, 0.4)" : "none", display: "grid", placeItems: "center", cursor: "pointer", transition: "all 220ms" }}
          >
            <span style={{ width: 12, height: 20, borderRadius: 6, border: `1.5px solid ${pressed ? "#0B0B0C" : CHAMPAGNE}` }} />
          </button>
        )}
        {mode === "auto" && (
          <span style={{ width: 10, height: 10, borderRadius: 999, background: activity === "listening" ? CHAMPAGNE : HAIRLINE, boxShadow: activity === "listening" ? "0 0 14px 3px rgba(201, 169, 110, 0.5)" : "none", animation: activity === "listening" ? "nr-breathe 2.6s ease-in-out infinite" : undefined }} />
        )}
      </div>
    </div>
  );
}
