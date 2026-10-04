import type { CSSProperties } from "react";

import type { AgentActivity } from "@/lib/voice-agent";

/** Fixed amplitudes and speeds, so the bars look organic without randomness during render. */
const AMPS = [0.42, 0.66, 0.52, 0.88, 0.6, 0.98, 0.72, 0.48, 0.84, 0.62, 1, 0.68, 0.46, 0.8, 0.58, 0.94, 0.64, 0.4, 0.76, 0.54];
const DURATIONS = [760, 620, 880, 700, 540, 940, 660, 820, 580, 900, 720, 600, 840, 680, 560, 980];
const BAR_FILL = "linear-gradient(180deg, #FBBF24 0%, #F59E0B 55%, #D97706 100%)";

/** Amber rounded bars: they dance while speaking, breathe while listening, shimmer while thinking. */
export function Waveform({ mode, bars = 24, height = 52 }: { mode: AgentActivity; bars?: number; height?: number }) {
  const center = (bars - 1) / 2;
  return (
    <span className="lm-wave" data-mode={mode} aria-hidden style={{ display: "inline-flex", alignItems: "center", gap: 5, height }}>
      {Array.from({ length: bars }, (_, index) => {
        const edge = Math.abs(index - center) / (center + 1);
        const amp = AMPS[index % AMPS.length] * (1 - edge * edge * 0.6);
        const duration = DURATIONS[index % DURATIONS.length];
        const style = {
          "--amp": amp.toFixed(3),
          "--dur": `${duration}ms`,
          "--delay": `${-((index * 137) % duration)}ms`,
          "--edge": `${Math.round(edge * 520)}ms`,
          "--step": `${index * 55}ms`,
          width: 6,
          height: "100%",
          flex: "none",
          borderRadius: 999,
          background: BAR_FILL,
        } as CSSProperties;
        return <span key={index} className="lm-bar" style={style} />;
      })}
    </span>
  );
}
