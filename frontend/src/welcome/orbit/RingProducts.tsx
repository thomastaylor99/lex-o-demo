/* eslint-disable @next/next/no-img-element -- static packshots, no optimisation needed */

import { PRODUCTS } from "./copy";

/** The visible orbit, in percent of the screen; the products travel along it, upright. */
const RX = 43;
const RY = 38;

/**
 * Orbit, ring: a fine ellipse drawn around the headline, and the products travelling slowly
 * along it. Each product multiplies into the page, so the packshots' white disappears.
 */
export function RingProducts({ starting }: { starting: boolean }) {
  const period = starting ? 28 : 120;
  const shown = PRODUCTS.slice(0, 7);
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
        <ellipse cx={50} cy={50} rx={RX} ry={RY} fill="none" stroke="rgba(11, 11, 12, 0.12)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      </svg>
      {shown.map((product, i) => (
        <img
          key={product.id}
          src={`/products/${product.id}.png`}
          alt=""
          className="ob-motion"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: 124,
            width: "auto",
            mixBlendMode: "multiply",
            offsetPath: `ellipse(${RX}% ${RY}% at 50% 50%)`,
            offsetRotate: "0deg",
            animation: `ob-travel ${period}s linear ${-(i / shown.length) * period}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
