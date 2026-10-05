import type { CSSProperties } from "react";

import type { AgentActivity } from "@/lib/voice-agent";

import { YELLOW } from "./theme";

/** Fixed amplitudes and speeds, so the bars look organic without randomness. */
const AMPS = [
  0.42, 0.66, 0.5, 0.88, 0.58, 0.96, 0.7, 0.46, 0.84, 0.6, 1, 0.64, 0.44, 0.8, 0.56, 0.92, 0.62, 0.4, 0.76, 0.52,
  0.9, 0.6, 0.48, 0.72, 0.42, 0.82, 0.58, 0.38, 0.68, 0.5, 0.86, 0.46,
];
const DURATIONS = [760, 620, 880, 700, 540, 940, 660, 820, 580, 900, 720, 600, 840, 680, 560, 980, 640, 780, 520, 860];
const EDGES = "linear-gradient(to right, transparent 0, #000 12%, #000 88%, transparent 100%)";

/**
 * Yellow voice bars. Speaking: tall and lively. Listening: a gentle swell. Thinking: a wave that
 * travels along the row. Idle: a quiet dotted rest. Wider containers simply reveal more bars.
 */
export function Waveform({ activity, bars = 56, height = 44 }: { activity: AgentActivity; bars?: number; height?: number }) {
  const centre = (bars - 1) / 2;
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
          background: YELLOW,
        } as CSSProperties;
        return <span key={index} className="fr-bar" style={style} />;
      })}
    </span>
  );
}
