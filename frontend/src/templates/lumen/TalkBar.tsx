"use client";

import { useState } from "react";

import type { MicMode } from "@/lib/api";
import type { AgentActivity } from "@/lib/voice-agent";

import { AMBER, AMBER_DEEP, AMBER_SHADOW, CARD_SHADOW, FAINT, MUTED, SURFACE, TEXT, WHITE } from "./theme";

const MODES: { value: MicMode; label: string }[] = [
  { value: "auto", label: "Hands-free" },
  { value: "push_to_talk", label: "Hold to talk" },
];

function MicIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </svg>
  );
}

/** A rounded dock: microphone mode on the left, the hint in the middle, the hold button on the right. */
export function TalkBar(props: {
  mode: MicMode;
  setMode: (mode: MicMode) => void;
  activity: AgentActivity;
  pttDown: () => void;
  pttUp: () => void;
}) {
  const { mode, setMode, activity, pttDown, pttUp } = props;
  const [pressed, setPressed] = useState(false);
  const release = () => {
    if (!pressed) return;
    setPressed(false);
    pttUp();
  };
  const listening = activity === "listening";
  const live = mode === "auto" ? listening : pressed;
  const hint =
    mode === "auto"
      ? listening
        ? "Listening, just speak"
        : "One moment"
      : pressed
        ? "Release when you are done"
        : "Hold to talk, or hold the space bar";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 20, marginTop: 8, background: SURFACE, borderRadius: 999, padding: 8, minHeight: 84 }}>
      <div role="radiogroup" aria-label="Microphone mode" style={{ justifySelf: "start", display: "flex", gap: 4 }}>
        {MODES.map((option) => {
          const on = mode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setMode(option.value)}
              style={{
                fontSize: 17,
                fontWeight: 600,
                padding: "14px 24px",
                borderRadius: 999,
                background: on ? WHITE : "transparent",
                color: on ? TEXT : MUTED,
                boxShadow: on ? CARD_SHADOW : "none",
                cursor: "pointer",
                transition: "background 250ms ease, color 250ms ease, box-shadow 250ms ease",
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <p key={hint} className="lm-fade" style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 21, fontWeight: 500, color: live ? TEXT : MUTED }}>
        <span style={{ position: "relative", width: 14, height: 14, flex: "none" }}>
          {live && <span className="lm-ring" style={{ position: "absolute", inset: 0, borderRadius: 999, border: `2px solid ${AMBER}` }} />}
          <span className={live ? "lm-pulse" : undefined} style={{ position: "absolute", inset: 0, borderRadius: 999, background: live ? AMBER : FAINT }} />
        </span>
        {hint}
      </p>

      <div style={{ justifySelf: "end", display: "flex" }}>
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
            onPointerCancel={release}
            style={{
              width: 68,
              height: 68,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              background: pressed ? AMBER_DEEP : AMBER,
              boxShadow: pressed ? `0 0 0 8px rgba(245, 158, 11, 0.22), ${AMBER_SHADOW}` : AMBER_SHADOW,
              transform: pressed ? "scale(1.08)" : "none",
              transition: "transform 180ms ease, background 180ms ease, box-shadow 180ms ease",
              cursor: "pointer",
              touchAction: "none",
            }}
          >
            <MicIcon color={TEXT} />
          </button>
        )}
      </div>
    </div>
  );
}
