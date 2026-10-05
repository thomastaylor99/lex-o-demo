import type { CSSProperties } from "react";

import { gold, GOLD_LIGHT } from "./theme";

/**
 * Specks of gold dust around the eclipse: where each starts (percent of the screen), its size and
 * drift in pixels, and its timing in seconds. Fixed values, so the server and the browser agree.
 */
const MOTES = [
  { x: 18, y: 72, size: 3, dx: 14, dy: -120, dur: 15, delay: -2, alpha: 0.55 },
  { x: 24, y: 40, size: 2, dx: -10, dy: -90, dur: 12, delay: -7, alpha: 0.5 },
  { x: 29, y: 86, size: 4, dx: 22, dy: -150, dur: 18, delay: -11, alpha: 0.45 },
  { x: 31, y: 24, size: 2, dx: 8, dy: -70, dur: 11, delay: -4, alpha: 0.4 },
  { x: 71, y: 28, size: 3, dx: -16, dy: -100, dur: 14, delay: -9, alpha: 0.5 },
  { x: 76, y: 64, size: 2, dx: 12, dy: -110, dur: 13, delay: -1, alpha: 0.55 },
  { x: 82, y: 46, size: 3, dx: -8, dy: -130, dur: 17, delay: -13, alpha: 0.45 },
  { x: 69, y: 85, size: 4, dx: -20, dy: -160, dur: 19, delay: -5, alpha: 0.4 },
  { x: 13, y: 52, size: 2, dx: 10, dy: -80, dur: 12, delay: -8, alpha: 0.35 },
  { x: 87, y: 76, size: 2, dx: -12, dy: -100, dur: 14, delay: -3, alpha: 0.35 },
  { x: 40, y: 94, size: 3, dx: 6, dy: -120, dur: 16, delay: -12, alpha: 0.4 },
  { x: 60, y: 10, size: 2, dx: -6, dy: -60, dur: 10, delay: -6, alpha: 0.3 },
] as const;

/** Gold dust drifting upwards in the dark, as in a perfume film. Hidden under reduced motion. */
export function Motes() {
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {MOTES.map((m) => (
        <span
          key={`${m.x}-${m.y}`}
          className="ec-mote"
          style={
            {
              position: "absolute",
              left: `${m.x}%`,
              top: `${m.y}%`,
              width: m.size,
              height: m.size,
              borderRadius: "50%",
              background: GOLD_LIGHT,
              boxShadow: `0 0 ${m.size * 4}px ${m.size}px ${gold(0.5)}`,
              opacity: 0,
              "--dx": `${m.dx}px`,
              "--dy": `${m.dy}px`,
              "--dur": `${m.dur}s`,
              "--delay": `${m.delay}s`,
              "--o": String(m.alpha),
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
