/* eslint-disable @next/next/no-img-element -- static packshots, no optimisation needed */

import { PRODUCTS } from "./copy";

/**
 * Orbit, halo: the products as a crown arcing over the headline, each drifting gently. The blend
 * sits on the outer element: on the drifting image alone, its transform would isolate it.
 */
export function Crown({ starting }: { starting: boolean }) {
  const shown = PRODUCTS.slice(0, 7);
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {shown.map((product, i) => {
        const t = shown.length === 1 ? 0.5 : i / (shown.length - 1);
        const x = 13 + t * 74;
        const y = 25 - 12 * Math.sin(t * Math.PI);
        const height = 118 + 26 * Math.sin(t * Math.PI);
        return (
          <div
            key={product.id}
            className="ob-fade"
            style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)", mixBlendMode: "multiply", animationDelay: `${200 + i * 110}ms` }}
          >
            <img
              src={`/products/${product.id}.png`}
              alt=""
              className="ob-motion"
              style={{
                display: "block",
                height,
                width: "auto",
                animation: `ob-drift ${starting ? 2.4 : 7 + (i % 3)}s ease-in-out ${i * 0.5}s infinite`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
