import type { CSSProperties } from "react";

import type { AgentActivity } from "@/lib/voice-agent";

import { AMBER, TEXT } from "./theme";

/** Fixed amplitudes and speeds, so the bars look organic without randomness. */
const AMPS = [0.42, 0.7, 0.55, 0.92, 0.62, 1, 0.74, 0.5, 0.86, 0.64, 0.96, 0.68, 0.46, 0.8, 0.58, 0.9, 0.66, 0.44, 0.78, 0.54];
const DURATIONS = [780, 640, 900, 720, 560, 960, 680, 840, 600, 920, 740, 620];
const SPEAKING = "linear-gradient(180deg, #FFC995 0%, #FF9A3C 55%, #F0782A 100%)";

function barStyle(activity: AgentActivity, index: number, count: number): CSSProperties {
  const center = (count - 1) / 2;
  const distance = Math.abs(index - center) / (center + 1);
  const amp = (AMPS[index % AMPS.length] ?? 0.6) * (1 - distance * distance * 0.65);
  const duration = DURATIONS[index % DURATIONS.length] ?? 700;
  const base = {
    "--amp": amp.toFixed(3),
    width: 7,
    minHeight: 7,
    height: "12%",
    flex: "none",
    borderRadius: 999,
    transition: "background-color 400ms ease, opacity 400ms ease",
  } as CSSProperties;

  switch (activity) {
    case "speaking":
      return {
        ...base,
        background: SPEAKING,
        boxShadow: "0 0 14px rgba(255, 154, 60, 0.35)",
        animation: `em-dance ${duration}ms ease-in-out ${-((index * 137) % duration)}ms infinite`,
      };
    case "listening":
      return { ...base, background: AMBER, animation: `em-breathe 2.8s ease-in-out ${index * 45}ms infinite` };
    case "thinking":
      return { ...base, background: TEXT, animation: `em-sweep 1.6s ease-in-out ${index * 48}ms infinite` };
    default:
      return { ...base, background: "rgba(243, 244, 246, 0.22)" };
  }
}

/** Rounded bars: they dance while the agent speaks, breathe while it listens, shimmer while it thinks. */
export function Waveform({ activity, bars = 26, height = 64 }: { activity: AgentActivity; bars?: number; height?: number }) {
  return (
    <span aria-hidden style={{ display: "flex", alignItems: "center", gap: 5, height }}>
      {Array.from({ length: bars }, (_, index) => (
        <span key={index} style={barStyle(activity, index, bars)} />
      ))}
    </span>
  );
}
