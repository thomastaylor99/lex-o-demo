"use client";

import { useEffect, useMemo, useState } from "react";

import { initialSnapshot, VoiceEngine, type Snapshot } from "@/lib/voice-engine";
import type { VoiceAgent } from "@/lib/voice-agent";

/** The live voice conversation (spec 003). The engine owns the state; React mirrors it. */
export function useVoiceAgent(): VoiceAgent {
  const [snapshot, setSnapshot] = useState<Snapshot>(() => initialSnapshot());
  const engine = useMemo(() => new VoiceEngine(setSnapshot), []);

  // Stable actions: effects that depend on them (autostart) run once.
  const actions = useMemo(
    () => ({
      start: () => engine.start(),
      end: () => engine.end(),
      setMode: (mode: VoiceAgent["mode"]) => engine.setMode(mode),
      pttDown: () => engine.pttDown(),
      pttUp: () => engine.pttUp(),
      submitEmail: (email: string) => engine.submitEmail(email),
    }),
    [engine],
  );

  // Leaving the page ends the session: mic off, audio stopped, server session deleted.
  useEffect(() => () => void engine.end(), [engine]);

  return useMemo(() => ({ ...snapshot, ...actions }), [snapshot, actions]);
}
