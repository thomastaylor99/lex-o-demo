"use client";

import { useEffect } from "react";

import { useMockVoiceAgent } from "@/dev/mockVoiceAgent";
import { useScreenAgent } from "@/hooks/useScreenAgent";
import type { ScreenAgent } from "@/skins/types";

/**
 * The scripted conversation as a screen agent, started on mount, for the voice-bar templates.
 * Restart shows the welcome screen; Begin plays the script again.
 */
export function useVariantAgent(): ScreenAgent {
  const agent = useScreenAgent(useMockVoiceAgent());
  const { start } = agent;
  useEffect(() => {
    void start();
  }, [start]);
  return agent;
}
