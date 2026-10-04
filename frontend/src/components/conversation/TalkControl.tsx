"use client";

import { useState } from "react";

import type { MicMode } from "@/lib/api";
import type { AgentActivity } from "@/lib/voice-agent";
import type { Labels } from "@/components/i18n";

/** Hands-free by default; hold-to-talk one switch away (the space bar drives it too). */
export function TalkControl({
  mode,
  setMode,
  activity,
  holding,
  pttDown,
  pttUp,
  t,
}: {
  mode: MicMode;
  setMode: (mode: MicMode) => void;
  activity: AgentActivity;
  holding: boolean;
  pttDown: () => void;
  pttUp: () => void;
  t: Labels;
}) {
  const [pressed, setPressed] = useState(false);
  const active = pressed || holding;
  const busy = activity === "thinking" || activity === "speaking";

  const press = () => {
    setPressed(true);
    pttDown();
  };
  const release = () => {
    if (!pressed) return;
    setPressed(false);
    pttUp();
  };

  return (
    <div className="flex items-center justify-between border-t border-hairline pt-7">
      <div className="flex rounded-full border border-hairline p-1 text-[15px] tracking-[0.06em]">
        {(["auto", "push_to_talk"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            className={`rounded-full px-5 py-2 transition-colors duration-300 ${
              mode === option ? "bg-ink text-paper" : "text-taupe hover:text-ink"
            }`}
          >
            {option === "auto" ? t.handsFree : t.holdToTalk}
          </button>
        ))}
      </div>

      {mode === "push_to_talk" ? (
        <div className="flex items-center gap-5">
          <span className="text-[15px] tracking-[0.04em] text-taupe">
            {active ? t.talkNow : busy ? t.waiting : t.holdHint}
          </span>
          <button
            type="button"
            aria-label={t.holdToTalk}
            onPointerDown={press}
            onPointerUp={release}
            onPointerLeave={release}
            onPointerCancel={release}
            className={`relative grid size-[72px] select-none place-items-center rounded-full border transition-all duration-300 ${
              active ? "scale-105 border-copper bg-copper" : "border-ink/70 hover:border-ink"
            }`}
          >
            <span
              className={`h-6 w-[3px] rounded-full transition-colors ${active ? "bg-paper" : "bg-ink"}`}
            />
            {active && (
              <span
                className="absolute inset-0 rounded-full border border-copper"
                style={{ animation: "halo-ripple 1.2s ease-out infinite" }}
              />
            )}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-[15px] tracking-[0.04em] text-taupe">
          <span
            className={`size-2 rounded-full ${activity === "listening" ? "bg-copper" : "bg-mist"}`}
            style={activity === "listening" ? { animation: "halo-breathe 2.4s ease-in-out infinite" } : undefined}
          />
          {activity === "listening" ? t.justSpeak : t.waiting}
        </div>
      )}
    </div>
  );
}
