"use client";

import { useEffect, useState } from "react";

import { labels } from "@/components/i18n";
import type { MicMode } from "@/lib/api";
import type { Language } from "@/lib/events";
import type { AgentActivity } from "@/lib/voice-agent";

import { BUBBLE, PANEL, WHITE, WHITE_64, YELLOW } from "./styles";

/** Hands-free or hold to talk, a plain hint, and the yellow hold button (also the space bar). */
export function TalkBar(props: {
  mode: MicMode;
  setMode: (mode: MicMode) => void;
  activity: AgentActivity;
  pttDown: () => void;
  pttUp: () => void;
  language: Language;
}) {
  const { mode, setMode, activity, pttDown, pttUp, language } = props;
  const l = labels(language);
  const [pressed, setPressed] = useState(false);
  const press = () => {
    if (pressed) return;
    setPressed(true);
    pttDown();
  };
  const release = () => {
    if (!pressed) return;
    setPressed(false);
    pttUp();
  };

  useEffect(() => {
    if (mode !== "push_to_talk") return;
    const down = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      event.preventDefault();
      if (event.repeat) return;
      setPressed(true);
      pttDown();
    };
    const up = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      event.preventDefault();
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
        ? l.justSpeak
        : l.waiting
      : pressed
        ? l.talkNow
        : `${l.holdToTalk}, ${l.holdHint}`;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 18, background: PANEL, borderRadius: 999, padding: 10, minHeight: 88 }}>
      <div role="radiogroup" aria-label="Microphone mode" style={{ display: "flex", background: BUBBLE, borderRadius: 999, padding: 5 }}>
        {(["auto", "push_to_talk"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={mode === option}
            className="ox-btn"
            onClick={() => setMode(option)}
            style={{
              fontSize: 18,
              fontWeight: 600,
              fontFamily: "inherit",
              padding: "12px 24px",
              borderRadius: 999,
              background: mode === option ? YELLOW : "transparent",
              color: mode === option ? "#0B0B0C" : WHITE_64,
            }}
          >
            {option === "auto" ? l.handsFree : l.holdToTalk}
          </button>
        ))}
      </div>
      <span style={{ flex: 1, fontSize: 21, fontWeight: 500, color: (mode === "auto" && listening) || pressed ? WHITE : WHITE_64 }}>{hint}</span>
      {mode === "auto" ? (
        <span
          aria-hidden
          style={{
            width: 16,
            height: 16,
            marginRight: 26,
            borderRadius: 999,
            background: listening ? YELLOW : BUBBLE,
            boxShadow: listening ? "0 0 18px rgba(255, 200, 61, 0.7)" : "none",
            animation: listening ? "ox-dot 1.6s ease-in-out infinite" : undefined,
          }}
        />
      ) : (
        <button
          type="button"
          aria-label={l.holdToTalk}
          className="ox-btn"
          onPointerDown={press}
          onPointerUp={release}
          onPointerLeave={release}
          onPointerCancel={release}
          onContextMenu={(event) => event.preventDefault()}
          style={{
            width: 68,
            height: 68,
            borderRadius: 999,
            display: "grid",
            placeItems: "center",
            touchAction: "none",
            background: pressed ? YELLOW : BUBBLE,
            transform: pressed ? "scale(1.08)" : "none",
            boxShadow: pressed ? "0 0 0 10px rgba(255, 200, 61, 0.18), 0 0 40px rgba(255, 200, 61, 0.55)" : "none",
          }}
        >
          <span style={{ width: 16, height: 26, borderRadius: 9, border: `3px solid ${pressed ? "#0B0B0C" : YELLOW}` }} />
        </button>
      )}
    </div>
  );
}
