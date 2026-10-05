"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { labels } from "@/components/i18n";
import type { MicMode } from "@/lib/api";
import type { Language } from "@/lib/events";
import type { VoiceAgent } from "@/lib/voice-agent";
import { MicIcon } from "@/skins/frost/icons";
import { fs, INK, MUTED, SURFACE, YELLOW } from "@/skins/frost/theme";

const MODE_BUTTON = { borderRadius: 999, padding: "11px 20px", fontSize: fs(17), fontWeight: 600, cursor: "pointer", transition: "background-color 220ms, color 220ms" } as const;

/** Keys typed into a form field or editable text never reach the microphone. */
function typing(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable);
}

/**
 * The Frost talk bar without its state text, for templates whose voice element shows the state:
 * the mode switch, and in hold-to-talk the hint and the hold button (pointer or space bar).
 */
export function QuietTalkBar(props: {
  status: VoiceAgent["status"];
  mode: MicMode;
  setMode: (mode: MicMode) => void;
  language: Language;
  pttDown: () => void;
  pttUp: () => void;
}) {
  const { status, mode, setMode, language, pttDown, pttUp } = props;
  const l = labels(language);
  const live = status === "live";
  const holdToTalk = live && mode === "push_to_talk";
  const [pressed, setPressed] = useState(false);
  const held = useRef(false);
  const ptt = useRef({ pttDown, pttUp });
  useEffect(() => {
    ptt.current = { pttDown, pttUp };
  });

  // One pttDown and one pttUp per hold, whatever starts or ends it.
  const press = useCallback(() => {
    if (held.current) return;
    held.current = true;
    setPressed(true);
    ptt.current.pttDown();
  }, []);
  const release = useCallback(() => {
    if (!held.current) return;
    held.current = false;
    setPressed(false);
    ptt.current.pttUp();
  }, []);

  // The space bar holds only while live in hold-to-talk. Leaving the window, a mode change or unmounting releases.
  useEffect(() => {
    if (!holdToTalk) return;
    const down = (event: KeyboardEvent) => {
      if (event.code !== "Space" || typing(event.target)) return;
      event.preventDefault();
      if (!event.repeat) press();
    };
    const up = (event: KeyboardEvent) => {
      if (event.code !== "Space" || !held.current) return;
      event.preventDefault();
      release();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", release);
      release();
    };
  }, [holdToTalk, press, release]);

  const modes: [MicMode, string][] = [["auto", l.handsFree], ["push_to_talk", l.holdToTalk]];
  const hint = pressed ? l.talkNow : `${l.holdToTalk}, ${l.holdHint}`;

  return (
    <div style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 16, marginTop: 14, borderRadius: 999, padding: 8, background: SURFACE }}>
      <div role="radiogroup" aria-label={l.microphoneMode} style={{ display: "flex", borderRadius: 999, padding: 4, background: "#fff" }}>
        {modes.map(([option, label]) => {
          const on = mode === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setMode(option)}
              style={{ ...MODE_BUTTON, background: on ? INK : "transparent", color: on ? "#fff" : MUTED }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {mode === "push_to_talk" && (
        <>
          <span key={hint} className="fr-in" aria-live="polite" style={{ fontSize: fs(21), fontWeight: 500, color: pressed ? INK : MUTED }}>
            {hint}
          </span>
          <button
            type="button"
            aria-label={l.holdToTalk}
            aria-pressed={pressed}
            disabled={!live}
            onPointerDown={(event) => {
              event.preventDefault();
              press();
            }}
            onPointerUp={release}
            onPointerLeave={release}
            onPointerCancel={release}
            style={{
              width: 56,
              height: 56,
              display: "grid",
              placeItems: "center",
              borderRadius: 999,
              background: pressed ? YELLOW : INK,
              color: pressed ? INK : "#fff",
              boxShadow: pressed ? "0 0 0 7px rgba(255, 210, 63, 0.3)" : "none",
              transform: pressed ? "scale(1.06)" : "none",
              transition: "all 180ms",
              cursor: "pointer",
              touchAction: "none",
            }}
          >
            <MicIcon size={22} />
          </button>
        </>
      )}
    </div>
  );
}
