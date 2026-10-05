"use client";

import type { WelcomeProps } from "../types";
import { PRODUCTS } from "./copy";
import { Floating } from "./Floating";
import { Frame, TONES } from "./Frame";

/** The ellipse the products sit on, in percent of the screen; it tightens while connecting. */
const CENTRE = { x: 50, y: 52 };
const RADIUS = { x: 41, y: 35 };

/**
 * Orbit: airy white with a sense of wonder. Real products float around a luminous pearl with
 * the conversation screen's yellow at its core; the headline sits at the centre of the orbit.
 */
export function OrbitWelcome(props: WelcomeProps) {
  const pull = props.starting ? 0.9 : 1;
  return (
    <Frame {...props}>
      {/* The scaled layer is its own stacking context: it carries the page's background so the
          packshots' white can multiply into it. */}
      <div aria-hidden style={{ position: "absolute", inset: 0, background: TONES.light.page, transform: `scale(${pull})`, transition: "transform 1200ms cubic-bezier(0.2, 0.7, 0.1, 1)" }}>
        {PRODUCTS.map((product, index) => {
          const angle = (product.angle * Math.PI) / 180;
          const x = CENTRE.x + RADIUS.x * Math.cos(angle);
          const y = CENTRE.y + RADIUS.y * Math.sin(angle);
          return <Floating key={product.id} id={product.id} x={x} y={y} height={product.height} tilt={product.tilt} index={index} />;
        })}
      </div>
    </Frame>
  );
}
