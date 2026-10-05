import type { Tone } from "./Frame";

/**
 * Soft points of light travelling along an ellipse around the headline: the orbit without
 * products. Each point follows the path itself, so it stays round as it moves.
 */
export function Motes({
  tone,
  starting,
  count = 22,
  rx = 42,
  ry = 37,
  reverse = false,
}: {
  tone: Tone;
  starting: boolean;
  count?: number;
  rx?: number;
  ry?: number;
  reverse?: boolean;
}) {
  const rgb = tone === "dark" ? "255, 214, 90" : "255, 190, 30";
  const period = starting ? 30 : 140;
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {Array.from({ length: count }, (_, i) => {
        const size = 5 + ((i * 7) % 10);
        const alpha = tone === "dark" ? 0.5 + (i % 4) * 0.12 : 0.45 + (i % 4) * 0.12;
        return (
          <span
            key={i}
            className="ob-motion"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: size,
              height: size,
              borderRadius: 999,
              background: `rgba(${rgb}, ${alpha})`,
              boxShadow: `0 0 ${size * 3}px rgba(${rgb}, 0.7)`,
              offsetPath: `ellipse(${rx}% ${ry}% at 50% 50%)`,
              offsetRotate: "0deg",
              animation: [
                `ob-travel ${period}s linear ${-(i / count) * period}s infinite${reverse ? " reverse" : ""}`,
                `ob-twinkle ${3 + (i % 5)}s ease-in-out ${i * 0.37}s infinite`,
              ].join(", "),
            }}
          />
        );
      })}
    </div>
  );
}
