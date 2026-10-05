import type { CSSProperties } from "react";

import type { AgentActivity } from "@/lib/voice-agent";
import { YELLOW } from "@/skins/frost/theme";

/** Fixed amplitudes and speeds, so the bars look organic without randomness (as frost's Waveform). */
const AMPS = [
  0.42, 0.66, 0.5, 0.88, 0.58, 0.96, 0.7, 0.46, 0.84, 0.6, 1, 0.64, 0.44, 0.8, 0.56, 0.92, 0.62, 0.4, 0.76, 0.52,
  0.9, 0.6, 0.48, 0.72, 0.42, 0.82, 0.58, 0.38, 0.68, 0.5, 0.86, 0.46,
];
const DURATIONS = [760, 620, 880, 700, 540, 940, 660, 820, 580, 900, 720, 600, 840, 680, 560, 980, 640, 780, 520, 860];
const EDGES = "linear-gradient(to right, transparent 0, #000 10%, #000 90%, transparent 100%)";

/**
 * Frost's waveform, coloured by whose voice it is: yellow while the agent speaks or thinks, white
 * while it listens to the visitor. The motion comes from frost's fr-wave and fr-bar classes: lively
 * when speaking, a travelling wave when thinking, a calm swell when listening, dotted at rest.
 */
export function DockWave({ activity, bars = 72, height = 40 }: { activity: AgentActivity; bars?: number; height?: number }) {
  const centre = (bars - 1) / 2;
  const colour = activity === "listening" ? "#fff" : YELLOW;
  return (
    <span
      className="fr-wave"
      data-mode={activity}
      aria-hidden
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        height,
        overflow: "hidden",
        maskImage: EDGES,
        WebkitMaskImage: EDGES,
      }}
    >
      {Array.from({ length: bars }, (_, index) => {
        const distance = Math.abs(index - centre) / (centre + 1);
        const amp = (AMPS[index % AMPS.length] ?? 0.6) * (1 - distance * distance * 0.5);
        const duration = DURATIONS[index % DURATIONS.length] ?? 700;
        const style = {
          "--amp": amp.toFixed(3),
          "--dur": `${duration}ms`,
          "--delay": `${-((index * 137) % duration)}ms`,
          "--i": index,
          height,
          background: colour,
          transition: "opacity 400ms, background-color 400ms",
        } as CSSProperties;
        return <span key={index} className="fr-bar" style={style} />;
      })}
    </span>
  );
}
