"use client";

import { useEffect } from "react";

import { AdvisorExperience } from "@/components/app/AdvisorExperience";
import { useMockVoiceAgent } from "@/dev/mockVoiceAgent";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";

function LiveAdvisor({ autostart }: { autostart: boolean }) {
  const agent = useVoiceAgent();
  const { start } = agent;
  useEffect(() => {
    if (autostart) void start();
  }, [autostart, start]);
  return <AdvisorExperience agent={agent} />;
}

function MockAdvisor({ autostart }: { autostart: boolean }) {
  const agent = useMockVoiceAgent();
  const { start } = agent;
  useEffect(() => {
    if (autostart) void start();
  }, [autostart, start]);
  return <AdvisorExperience agent={agent} />;
}

/** `?mock=1` replays a scripted conversation for design work; `?autostart=1` skips the cover page. */
export function Advisor({ mock, autostart }: { mock: boolean; autostart: boolean }) {
  return mock ? <MockAdvisor autostart={autostart} /> : <LiveAdvisor autostart={autostart} />;
}
