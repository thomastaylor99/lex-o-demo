import { memo, type CSSProperties } from "react";

import { EASE } from "@/skins/frost/theme";

/** Bars across the line; space-between spreads them over the column, whatever its width. */
const COUNT = 280;
const ENDS = "linear-gradient(to right, transparent 0, #000 22%, #000 78%, transparent 100%)";
/** A soft yellow haze under the bars, so the thin voice still reads on white. */
const GLOW: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  top: "50%",
  height: 34,
  marginTop: -17,
  background: "linear-gradient(to bottom, rgba(255, 210, 63, 0), rgba(255, 210, 63, 0.3) 50%, rgba(255, 210, 63, 0))",
  maskImage: ENDS,
  WebkitMaskImage: ENDS,
  filter: "blur(5px)",
};

/** A fixed pseudo-random number in [0, 1) per bar and seed: organic, and the same on every render. */
function noise(index: number, seed: number): number {
  const value = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

/** Loudness along the line: two soft humps, fading to nothing at both ends. */
function envelope(x: number): number {
  const edge = Math.min(1, Math.min(x, 1 - x) / 0.2);
  const ends = edge * edge * (3 - 2 * edge);
  const hump = (centre: number, width: number) => Math.exp(-(((x - centre) / width) ** 2));
  return ends * Math.min(1, 0.5 + 0.5 * hump(0.3, 0.16) + 0.4 * hump(0.64, 0.2));
}

/** Neighbouring bars move nearly together, so the voice ripples instead of flickering. */
const BARS: CSSProperties[] = Array.from({ length: COUNT }, (_, index) => {
  const x = index / (COUNT - 1);
  const ripple = 0.5 + 0.5 * Math.sin(2 * Math.PI * (x * 9.2 + 0.15)) * Math.cos(2 * Math.PI * x * 3.1);
  const amp = envelope(x) * (0.42 + 0.43 * ripple + 0.15 * noise(index, 1));
  const duration = 420 + Math.round(200 * (0.5 + 0.5 * Math.sin(2 * Math.PI * x * 2.7)) + 90 * noise(index, 3));
  const phase = ((x * 6.4) % 1) * 0.8 + 0.2 * noise(index, 4);
  return {
    "--amp": amp.toFixed(3),
    "--dur": `${duration}ms`,
    "--delay": `${-Math.round(phase * duration)}ms`,
    "--flow": `${-Math.round((1 - x) * 3400)}ms`,
  } as CSSProperties;
});

/**
 * The agent's voice on the line: dense gold bars rippling like speech while a slow swell flows
 * from left to right. Off, the layer sinks back into the hairline and its animations pause.
 * Memoised: the transcript re-renders the skin on every word.
 */
export const VoiceLineBars = memo(function VoiceLineBars({ on }: { on: boolean }) {
  return (
    <span
      className="vl-bars"
      data-on={on}
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        opacity: on ? 1 : 0,
        transform: `scaleY(${on ? 1 : 0.15})`,
        transition: `opacity 420ms ease, transform 620ms ${EASE}`,
      }}
    >
      <span className="vl-glow" style={GLOW} />
      {BARS.map((style, index) => (
        <span key={index} className="vl-bar" style={style} />
      ))}
    </span>
  );
});
