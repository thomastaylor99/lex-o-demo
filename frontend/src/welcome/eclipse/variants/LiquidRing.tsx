import { gold } from "../theme";
import { FILL, METAL, rim } from "./shared";

const BLOOM = `radial-gradient(closest-side, transparent 52%, ${gold(0.22)} 58%, ${gold(0.07)} 74%, transparent 100%)`;
const DISC = "radial-gradient(circle at 50% 34%, #15100A 0%, #080605 55%, #020202 100%)";
/** A white glint running round the metal. */
const GLINT = "conic-gradient(from 0deg, transparent 0deg 300deg, rgba(255, 255, 255, 0.0) 312deg, rgba(255, 255, 255, 0.9) 340deg, transparent 352deg)";

/**
 * The eclipse in molten gold: a thick metallic band that shimmers as its golds turn, a blurred copy
 * for the bloom, a black disc set inside it, and a white glint running round. Fills its square parent.
 */
export function LiquidRing() {
  return (
    <div aria-hidden className="ec-ignite" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div className="ec-breathe" style={{ ...FILL, inset: "-32%", background: BLOOM }} />
      <div className="ec-liquid" style={{ ...FILL, filter: "blur(12px)", opacity: 0.85 }}>
        <div style={{ ...FILL, background: METAL, mask: rim(30), WebkitMask: rim(30) }} />
      </div>
      <div className="ec-liquid" style={FILL}>
        <div style={{ ...FILL, background: METAL, mask: rim(16), WebkitMask: rim(16) }} />
      </div>
      <div style={{ ...FILL, inset: 15, background: DISC, boxShadow: `inset 0 0 36px rgba(0, 0, 0, 0.95), inset 0 0 140px ${gold(0.06)}` }} />
      <div className="ec-arc" style={FILL}>
        <div style={{ ...FILL, background: GLINT, mask: rim(16), WebkitMask: rim(16), mixBlendMode: "screen" }} />
      </div>
    </div>
  );
}
