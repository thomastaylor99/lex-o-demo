"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Keys typed into a form field or editable text never reach the microphone. */
function typing(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable);
}

/**
 * Hold to talk from the dock's button or the space bar, as in frost's TalkBar. `enabled` is live and
 * in hold-to-talk. The dock reads `pressed` for its status text and its hold button.
 */
export function useHoldToTalk({ enabled, pttDown, pttUp }: { enabled: boolean; pttDown: () => void; pttUp: () => void }) {
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

  // The space bar holds only while enabled. Leaving the window, a mode change or unmounting releases.
  useEffect(() => {
    if (!enabled) return;
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
  }, [enabled, press, release]);

  return { pressed, press, release };
}
