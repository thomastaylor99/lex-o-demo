"use client";

import { useEffect, useState } from "react";

import type { MicMode } from "@/lib/api";
import type { AgentActivity } from "@/lib/voice-agent";

import { MicIcon } from "./icons";
import { AMBER, MUTED, SURFACE, TEXT } from "./styles";

const MODES: { value: MicMode; label: string }[] = [
  { value: "auto", label: "Hands-free" },
  { value: "push_to_talk", label: "Hold to talk" },
];

/** A rounded dock: the microphone mode switch, a plain hint, and the amber hold button. */
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
  const press = () => {
    setPressed(true);
    pttDown();
  };
  const release = () => {
    if (!pressed) return;
    setPressed(false);
    pttUp();
  };

  // Hold the space bar to talk, in hold-to-talk mode.
  useEffect(() => {
    if (mode !== "push_to_talk") return;
    let held = false;
    const down = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      event.preventDefault();
      if (held || event.repeat) return;
      held = true;
      setPressed(true);
      pttDown();
    };
    const up = (event: KeyboardEvent) => {
      if (event.code !== "Space" || !held) return;
      event.preventDefault();
      held = false;
      setPressed(false);
      pttUp();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [mode, pttDown, pttUp]);

  const listening = activity === "listening";
  const hint =
    mode === "auto"
      ? listening
        ? "Listening, just speak"
        : "One moment"
      : pressed
        ? "Release when you are done"
        : "Hold to talk, or hold the space bar";

  return (
    <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 20, margin: "8px 48px 28px", padding: 10, borderRadius: 999, background: SURFACE }}>
      <div style={{ display: "flex", gap: 4 }}>
        {MODES.map((option) => {
          const on = mode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              className="du-button"
              aria-pressed={on}
              onClick={() => setMode(option.value)}
              style={{ height: 52, padding: "0 24px", borderRadius: 999, fontSize: 17, fontWeight: 700, background: on ? TEXT : "transparent", color: on ? "#fff" : MUTED }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <p style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, fontSize: 20, fontWeight: 600, color: listening || pressed ? TEXT : MUTED }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: listening || pressed ? AMBER : "#CBD5E1", animation: listening ? "du-dot 1.6s ease-in-out infinite" : undefined }} />
        {hint}
      </p>

      {mode === "push_to_talk" ? (
        <button
          type="button"
          aria-label="Hold to talk"
          onPointerDown={press}
          onPointerUp={release}
          onPointerLeave={release}
          className="du-button"
          style={{
            width: 64,
            height: 64,
            borderRadius: 999,
            display: "grid",
            placeItems: "center",
            background: AMBER,
            color: TEXT,
            touchAction: "none",
            transform: pressed ? "scale(1.08)" : "none",
            boxShadow: pressed ? "0 0 0 10px rgba(255, 154, 60, 0.25), 0 10px 26px rgba(255, 154, 60, 0.45)" : "0 6px 16px rgba(255, 154, 60, 0.35)",
          }}
        >
          <MicIcon size={26} />
        </button>
      ) : (
        <span aria-hidden style={{ width: 52, height: 52, marginRight: 6, borderRadius: 999, display: "grid", placeItems: "center", background: listening ? AMBER : "#E2E8F0", color: listening ? TEXT : MUTED, transition: "background-color 300ms" }}>
          <MicIcon size={22} />
        </span>
      )}
    </div>
  );
}
