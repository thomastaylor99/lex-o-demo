"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { MicMode } from "@/lib/api";
import type { AgentActivity } from "@/lib/voice-agent";

import { MicControl } from "./MicControl";
import { AMBER, FAINT, MUTED, TEXT, glass } from "./theme";

/** Microphone mode switch, a plain hint, and in hold-to-talk mode the hold button (or the space bar). */
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
  const held = useRef(false);
  const [pressed, setPressed] = useState(false);
  const press = useCallback(() => {
    if (held.current) return;
    held.current = true;
    setPressed(true);
    pttDown();
  }, [pttDown]);
  const release = useCallback(() => {
    if (!held.current) return;
    held.current = false;
    setPressed(false);
    pttUp();
  }, [pttUp]);

  useEffect(() => {
    if (mode !== "push_to_talk") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      event.preventDefault();
      if (event.type === "keydown") press();
      else release();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, [mode, press, release]);

  const hold = mode === "push_to_talk";
  const listening = !hold && activity === "listening";
  const live = listening || (hold && pressed);
  const hint = !hold
    ? listening
      ? "Listening, just speak"
      : "One moment"
    : pressed
      ? "Release when you are done"
      : "Hold to talk, or hold the space bar";

  return (
    <div style={{ ...glass(999), flex: "none", display: "flex", alignItems: "center", gap: 24, padding: 10 }}>
      <div style={{ display: "flex", background: "rgba(255, 255, 255, 0.06)", borderRadius: 999, padding: 5 }}>
        {(["auto", "push_to_talk"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            aria-pressed={mode === option}
            className="em-press"
            style={{
              fontSize: 17,
              fontWeight: 600,
              padding: "11px 24px",
              borderRadius: 999,
              background: mode === option ? TEXT : "transparent",
              color: mode === option ? "#0E0F12" : MUTED,
              cursor: "pointer",
            }}
          >
            {option === "auto" ? "Hands-free" : "Hold to talk"}
          </button>
        ))}
      </div>

      <p aria-live="polite" style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, fontSize: 20, fontWeight: 500, color: live ? TEXT : MUTED }}>
        <span
          style={{ width: 10, height: 10, borderRadius: 999, background: live ? AMBER : FAINT, animation: live ? "em-pulse 1.6s ease-in-out infinite" : undefined }}
        />
        {hint}
      </p>

      <MicControl hold={hold} pressed={pressed} listening={listening} onPress={press} onRelease={release} />
    </div>
  );
}
