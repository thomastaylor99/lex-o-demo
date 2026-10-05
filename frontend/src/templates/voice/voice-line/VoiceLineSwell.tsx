import { memo } from "react";

import { EASE, QUIET } from "@/skins/frost/theme";

import { SOFT_GREY } from "./css";

const WIDTH = 1000;
const POINTS = 160;
const ENDS = "linear-gradient(to right, transparent 0, #000 8%, #000 92%, transparent 100%)";

/** A standing wave along the line, pinned at both ends, with `loops` humps tallest in the middle. */
function standingWave(loops: number, height: number): string {
  const points = Array.from({ length: POINTS + 1 }, (_, step) => {
    const x = step / POINTS;
    const y = height * (0.12 + 0.88 * Math.sin(Math.PI * x)) * Math.sin(Math.PI * loops * x);
    return `${(x * WIDTH).toFixed(1)} ${y.toFixed(2)}`;
  });
  return `M${points.join(" L")}`;
}

/** Two slow strings at different speeds: together they swell rather than vibrate. */
const STRINGS = [
  { d: standingWave(3, 10), colour: QUIET, width: 1.5, duration: 1900, delay: 0 },
  { d: standingWave(2, 12), colour: SOFT_GREY, width: 1, duration: 2700, delay: -1200 },
];

/**
 * The visitor's voice on the line: a soft grey swell, lower while they pause. Off, it flattens into
 * the hairline. The strings flex inside the SVG, so their strokes keep their width.
 */
export const VoiceLineSwell = memo(function VoiceLineSwell({ on, gain }: { on: boolean; gain: number }) {
  return (
    <span className="vl-swell" data-on={on} style={{ position: "absolute", inset: 0, opacity: on ? 1 : 0, transition: "opacity 420ms ease" }}>
      <svg
        viewBox={`0 -16 ${WIDTH} 32`}
        preserveAspectRatio="none"
        width="100%"
        height="100%"
        style={{ display: "block", overflow: "visible", maskImage: ENDS, WebkitMaskImage: ENDS }}
      >
        <g style={{ transform: `scaleY(${on ? gain : 0.1})`, transition: `transform 700ms ${EASE}` }}>
          {STRINGS.map((string, index) => (
            <path
              key={index}
              className="vl-string"
              d={string.d}
              fill="none"
              stroke={string.colour}
              strokeWidth={string.width}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              style={{ animationDuration: `${string.duration}ms`, animationDelay: `${string.delay}ms` }}
            />
          ))}
        </g>
      </svg>
    </span>
  );
});
