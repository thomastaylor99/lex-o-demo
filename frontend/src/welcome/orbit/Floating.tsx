/* eslint-disable @next/next/no-img-element -- static packshots, no optimisation needed */

/**
 * One product floating on the ellipse around the voice. The packshots have white backgrounds:
 * the whole floating group multiplies into the page (on the image alone, the drift's transform
 * would isolate it and the white would show).
 */
export function Floating({ id, x, y, height, tilt, index }: { id: string; x: number; y: number; height: number; tilt: number; index: number }) {
  return (
    <div
      className="ob-fade"
      style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)", animationDelay: `${300 + index * 120}ms`, mixBlendMode: "multiply" }}
    >
      <div className="ob-motion" style={{ animation: `ob-drift ${7 + (index % 3)}s ease-in-out ${index * 0.6}s infinite` }}>
        <img
          src={`/products/${id}.png`}
          alt=""
          style={{ display: "block", height, width: "auto", transform: `rotate(${tilt}deg)` }}
        />
      </div>
    </div>
  );
}
