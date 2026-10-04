import type { CSSProperties } from "react";

import { cx, type WaveMode } from "./shared";
import styles from "./studio.module.css";

/** Fixed bar amplitudes and speeds, so the waveform looks organic without randomness. */
const AMPS = [
  0.38, 0.62, 0.5, 0.86, 0.58, 0.96, 0.7, 0.46, 0.82, 0.6, 1, 0.66, 0.44, 0.78, 0.56, 0.92, 0.64, 0.4, 0.74,
  0.52, 0.88, 0.62, 0.48, 0.7, 0.42, 0.8, 0.58, 0.36, 0.66, 0.5, 0.84, 0.46,
];
const DURATIONS = [760, 620, 880, 700, 540, 940, 660, 820, 580, 900, 720, 600, 840, 680, 560, 980, 640, 780, 520, 860];

interface WaveformProps {
  mode: WaveMode;
  bars: number;
  className?: string;
}

/** A row of vertical bars: tall and lively while speaking, gentle while listening, a scan while thinking. */
export function Waveform({ mode, bars, className }: WaveformProps) {
  const center = (bars - 1) / 2;
  return (
    <span className={cx(styles.wave, className)} data-mode={mode} aria-hidden="true">
      {Array.from({ length: bars }, (_, index) => {
        const distance = Math.abs(index - center) / (center + 1);
        const envelope = 1 - distance * distance * 0.55;
        const amp = (AMPS[index % AMPS.length] ?? 0.6) * envelope;
        const duration = DURATIONS[index % DURATIONS.length] ?? 700;
        const style = {
          "--amp": amp.toFixed(3),
          "--dur": `${duration}ms`,
          "--delay": `${-((index * 137) % duration)}ms`,
          "--i": index,
        } as CSSProperties;
        return <span key={index} className={styles.waveBar} style={style} />;
      })}
    </span>
  );
}
