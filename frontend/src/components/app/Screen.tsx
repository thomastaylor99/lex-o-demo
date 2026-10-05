"use client";

import { useEffect } from "react";

import { useMockVoiceAgent } from "@/dev/mockVoiceAgent";
import { useScreenAgent } from "@/hooks/useScreenAgent";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";
import { FrostSkin } from "@/skins/frost/FrostSkin";

/** With `?autostart=1` the session starts on mount and the welcome screen is skipped (rehearsals, screenshots). */
function useAutostart(start: () => Promise<void>, autostart: boolean): void {
  useEffect(() => {
    if (autostart) void start();
  }, [autostart, start]);
}

/** The live conversation: the voice engine against the backend. */
export function LiveScreen({ autostart }: { autostart: boolean }) {
  const agent = useScreenAgent(useVoiceAgent());
  useAutostart(agent.start, autostart);
  return <FrostSkin agent={agent} />;
}

/** The scripted golden-path conversation, for design work and tests without a backend. */
export function MockScreen({ autostart }: { autostart: boolean }) {
  const agent = useScreenAgent(useMockVoiceAgent());
  useAutostart(agent.start, autostart);
  return <FrostSkin agent={agent} />;
}

/** The screen at `/`: `?mock=1` plays the scripted conversation, `?autostart=1` starts without a click. */
export function Screen({ mock, autostart }: { mock: boolean; autostart: boolean }) {
  return mock ? <MockScreen autostart={autostart} /> : <LiveScreen autostart={autostart} />;
}
