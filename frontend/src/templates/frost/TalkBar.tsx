"use client";

import { useEffect, useRef, useState } from "react";

import type { MicMode } from "@/lib/api";
import type { AgentActivity } from "@/lib/voice-agent";

import { MicIcon } from "./icons";
import { INK, MUTED, SURFACE, TRACK, YELLOW } from "./theme";

const MODES: { mode: MicMode; label: string }[] = [
  { mode: "auto", label: "Hands-free" },
  { mode: "push_to_talk", label: "Hold to talk" },
];

/** The microphone dock: mode switch, a plain hint, and the hold button (pointer or space bar). */
export function TalkBar(props: {
  mode: MicMode;
  setMode: (mode: MicMode) => void;
  activity: AgentActivity;
  pttDown: () => void;
  pttUp: () => void;
}) {
  const { mode, setMode, activity, pttDown, pttUp } = props;
  const [pressed, setPressed] = useState(false);
  const held = useRef(false);

  const press = () => {
    if (held.current) return;
    held.current = true;
    setPressed(true);
    pttDown();
  };
  const release = () => {
    if (!held.current) return;
    held.current = false;
    setPressed(false);
    pttUp();
  };

  useEffect(() => {
    if (mode !== "push_to_talk") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      event.preventDefault();
      const down = event.type === "keydown";
      if (event.repeat || held.current === down) return;
      held.current = down;
      setPressed(down);
      if (down) pttDown();
      else pttUp();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, [mode, pttDown, pttUp]);

  const listening = mode === "auto" && activity === "listening";
  const hint =
    mode === "auto"
      ? listening
        ? "Listening, just speak"
        : "One moment"
      : pressed
        ? "Release when you are done"
        : "Hold to talk, or hold the space bar";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 18, borderRadius: 999, padding: 10, background: SURFACE }}>
      <div role="radiogroup" aria-label="Microphone mode" style={{ display: "flex", borderRadius: 999, padding: 5, background: "#fff" }}>
        {MODES.map((option) => {
          const on = mode === option.mode;
          return (
            <button
              key={option.mode}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setMode(option.mode)}
              style={{
                borderRadius: 999,
                padding: "13px 24px",
                background: on ? INK : "transparent",
                color: on ? "#fff" : MUTED,
                fontSize: 17,
                fontWeight: 600,
                cursor: "pointer",
                transition: "background-color 220ms, color 220ms",
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14, paddingRight: mode === "auto" ? 18 : 0 }}>
        {mode === "auto" && (
          <span aria-hidden style={{ position: "relative", width: 14, height: 14 }}>
            {listening && <span className="fr-pulse" style={{ position: "absolute", inset: 0, borderRadius: 999, background: YELLOW }} />}
            <span style={{ position: "absolute", inset: 0, borderRadius: 999, background: listening ? YELLOW : TRACK, transition: "background-color 300ms" }} />
          </span>
        )}
        <span key={hint} className="fr-in" aria-live="polite" style={{ fontSize: 21, fontWeight: 500, color: listening || pressed ? INK : MUTED }}>
          {hint}
        </span>
        {mode === "push_to_talk" && (
          <button
            type="button"
            aria-label="Hold to talk"
            aria-pressed={pressed}
            onPointerDown={(event) => {
              event.preventDefault();
              press();
            }}
            onPointerUp={release}
            onPointerLeave={release}
            onPointerCancel={release}
            style={{
              width: 68,
              height: 68,
              display: "grid",
              placeItems: "center",
              borderRadius: 999,
              background: pressed ? YELLOW : INK,
              color: pressed ? INK : "#fff",
              boxShadow: pressed ? "0 0 0 8px rgba(255, 210, 63, 0.3)" : "none",
              transform: pressed ? "scale(1.06)" : "none",
              transition: "all 180ms",
              cursor: "pointer",
              touchAction: "none",
            }}
          >
            <MicIcon />
          </button>
        )}
      </div>
    </div>
  );
}
