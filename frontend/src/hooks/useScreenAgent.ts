"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

import type { VoiceAgent } from "@/lib/voice-agent";
import type { ScreenAgent } from "@/skins/types";

// The URL never changes while the screen is open, so the store has nothing to subscribe to.
const noSubscribe = () => () => {};
const cameraInUrl = () => new URLSearchParams(window.location.search).get("camera") === "1";

/**
 * Adds the screen controls to the live or scripted agent. Restart ends the session, so the
 * welcome screen shows for the next visitor. `?camera=1` shows the camera switch and opens the
 * V2 camera panel; the switch then opens and closes it.
 */
export function useScreenAgent(agent: VoiceAgent): ScreenAgent {
  const { end } = agent;
  const restart = useCallback(() => void end(), [end]);

  const cameraSwitch = useSyncExternalStore(noSubscribe, cameraInUrl, () => false);
  const [toggled, setToggled] = useState<boolean | null>(null);
  const camera = toggled ?? cameraSwitch;
  const toggleCamera = useCallback(() => setToggled(!camera), [camera]);

  return { ...agent, restart, camera, cameraSwitch, toggleCamera };
}
