"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { useMockVoiceAgent } from "@/dev/mockVoiceAgent";
import type { VoiceAgent } from "@/lib/voice-agent";

export interface DemoAgent extends VoiceAgent {
  replay: () => void;
  /** V2 camera slot: open when the page has `?camera=1`, or toggled from the template. */
  camera: boolean;
  toggleCamera: () => void;
}

const noSubscribe = () => () => {};
const cameraInUrl = () => new URLSearchParams(window.location.search).get("camera") === "1";

/** The scripted conversation, started on mount, for designing templates without a backend. */
export function useDemoAgent(): DemoAgent {
  const agent = useMockVoiceAgent();
  const { start, end } = agent;
  useEffect(() => {
    void start();
  }, [start]);
  const replay = useCallback(() => {
    void end().then(() => start());
  }, [end, start]);

  const urlCamera = useSyncExternalStore(noSubscribe, cameraInUrl, () => false);
  const [toggled, setToggled] = useState<boolean | null>(null);
  const camera = toggled ?? urlCamera;
  const toggleCamera = useCallback(() => setToggled(!camera), [camera]);

  return { ...agent, replay, camera, toggleCamera };
}
