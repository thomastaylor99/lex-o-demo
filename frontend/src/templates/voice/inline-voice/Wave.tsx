import type { CSSProperties } from "react";

import type { AgentActivity } from "@/lib/voice-agent";

/** Fixed amplitudes and speeds (Frost's), so the bars look organic without randomness. */
const AMPS = [0.42, 0.66, 0.5, 0.88, 0.58, 0.96, 0.7, 0.46, 0.84, 0.6, 1, 0.64, 0.44, 0.8, 0.56, 0.92];
const DURATIONS = [760, 620, 880, 700, 540, 940, 660, 820, 580, 900, 720, 600, 840, 680, 560, 980];
const EDGES = "linear-gradient(to right, transparent 0, #000 16%, #000 84%, transparent 100%)";

/**
 * A small voice wave that sits on a line of the conversation: thin rounded bars in one colour.
 * Speaking: lively. Thinking: a wave travelling along the row. Listening: a soft swell. Idle: at rest.
 */
export function InlineVoiceWave(props: { mode: AgentActivity; color: string; bars?: number; height?: number }) {
  const { mode, color, bars = 15, height = 20 } = props;
  const centre = (bars - 1) / 2;

  return (
    <span
      className="iv-wave"
      data-mode={mode}
      aria-hidden
      style={{ flex: "none", display: "inline-flex", alignItems: "center", gap: 3, height, maskImage: EDGES, WebkitMaskImage: EDGES }}
    >
      {Array.from({ length: bars }, (_, index) => {
        const distance = Math.abs(index - centre) / (centre + 1);
        const amp = (AMPS[index % AMPS.length] ?? 0.6) * (1 - distance * distance * 0.4);
        const duration = DURATIONS[index % DURATIONS.length] ?? 700;
        const style = {
          "--amp": amp.toFixed(3),
          "--dur": `${duration}ms`,
          "--delay": `${-((index * 137) % duration)}ms`,
          "--i": index,
          height,
          background: color,
        } as CSSProperties;
        return <span key={index} className="iv-bar" style={style} />;
      })}
    </span>
  );
}
