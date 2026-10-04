import { useCallback, useEffect, useRef, useState } from "react";

import type { MicMode } from "@/lib/api";

import { MicIcon } from "./icons";
import { cx, formatStatSeconds, waveModeFor, type PartProps } from "./shared";
import styles from "./studio.module.css";
import { Waveform } from "./Waveform";

function isEditable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

/** Mode switch, hold-to-talk (pointer or space bar), the mic state and the last reply time. */
export function TalkDock({ agent, l, c }: PartProps) {
  const { mode, setMode, pttDown, pttUp, status, activity, transcript, lastReplyMs, language } = agent;
  const [held, setHeld] = useState(false);
  const heldRef = useRef(false);

  const press = useCallback(() => {
    if (heldRef.current) return;
    heldRef.current = true;
    setHeld(true);
    pttDown();
  }, [pttDown]);

  const release = useCallback(() => {
    if (!heldRef.current) return;
    heldRef.current = false;
    setHeld(false);
    pttUp();
  }, [pttUp]);

  useEffect(() => {
    if (mode !== "push_to_talk") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat || isEditable(event.target)) return;
      event.preventDefault();
      press();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      event.preventDefault();
      release();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", release);
    };
  }, [mode, press, release]);

  const chooseMode = (next: MicMode) => {
    if (next === mode) return;
    release();
    setMode(next);
  };

  const visitorLive = transcript.some((entry) => entry.kind === "visitor" && !entry.final);
  const baseMode = waveModeFor(status, activity);
  const micMode = held || visitorLive ? "speaking" : baseMode;
  const sentence =
    status === "starting"
      ? c.connecting
      : status === "error"
        ? (agent.error ?? c.error)
        : activity === "listening"
          ? l.justSpeak
          : activity === "thinking"
            ? l.waiting
            : l.activity[activity];

  return (
    <footer className={styles.dock}>
      <div className={styles.segment} data-mode={mode} role="radiogroup" aria-label="Microphone mode">
        <span className={styles.segThumb} aria-hidden="true" />
        <button
          type="button"
          role="radio"
          aria-checked={mode === "auto"}
          className={styles.segBtn}
          onClick={() => chooseMode("auto")}
        >
          {l.handsFree}
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={mode === "push_to_talk"}
          className={styles.segBtn}
          onClick={() => chooseMode("push_to_talk")}
        >
          {l.holdToTalk}
        </button>
      </div>

      {mode === "push_to_talk" ? (
        <button
          type="button"
          className={styles.hold}
          data-held={held}
          aria-pressed={held}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            press();
          }}
          onPointerUp={release}
          onPointerCancel={release}
          onLostPointerCapture={release}
          onContextMenu={(event) => event.preventDefault()}
        >
          <span className={styles.controlIcon}>
            <MicIcon />
          </span>
          <span className={styles.controlText}>
            <span>{held ? l.talkNow : l.holdToTalk}</span>
            {held ? null : <span className={styles.holdHint}>{l.holdHint}</span>}
          </span>
          <Waveform mode={micMode} bars={5} className={styles.waveMini} />
        </button>
      ) : (
        <div className={styles.mic} data-mode={visitorLive ? "listening" : baseMode} aria-live="polite">
          <span className={styles.controlIcon}>
            <MicIcon />
          </span>
          <span>{sentence}</span>
          <Waveform mode={micMode} bars={5} className={styles.waveMini} />
        </div>
      )}

      <p className={cx(styles.mono, styles.readout)}>
        {lastReplyMs !== null ? (
          <>
            <span className={styles.readoutLabel}>{l.repliedIn}</span>{" "}
            <span key={lastReplyMs} className={styles.flash}>
              {formatStatSeconds(lastReplyMs, language)}
            </span>
          </>
        ) : null}
      </p>
    </footer>
  );
}
