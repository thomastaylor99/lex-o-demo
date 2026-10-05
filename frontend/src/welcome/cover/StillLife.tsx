import { Cutout } from "./Cutout";
import { HERO } from "./products";
import { GOLD, GOLD_DEEP, GOLD_LIGHT, u } from "./theme";

const DISC = 720;
const DISC_LEFT = 80;
const DISC_TOP = 110;
const RING_GAP = 26;

/** A circle on the artboard, inside the still-life frame. */
const circle = (inset: number) =>
  ({
    position: "absolute",
    left: u(DISC_LEFT - inset),
    top: u(DISC_TOP - inset),
    width: u(DISC + inset * 2),
    height: u(DISC + inset * 2),
    borderRadius: "50%",
  }) as const;

/**
 * The hero: three real products, cut out and overlapping in front of a lit gold disc, with a fine
 * gold ring around it. While the session connects, rings leave the disc like a voice.
 */
export function StillLife({ starting }: { starting: boolean }) {
  return (
    <div
      aria-hidden
      className="co-rise"
      style={{ position: "absolute", left: u(1000), top: u(150), width: u(880), height: u(900), animationDelay: "180ms" }}
    >
      <div style={{ ...circle(RING_GAP), border: `${u(1.5)} solid rgba(221, 174, 98, 0.38)` }} />

      {starting &&
        [0, 1200].map((delay) => (
          <div
            key={delay}
            className="co-ripple"
            style={{ ...circle(0), border: `${u(2)} solid ${GOLD}`, animationDelay: `${delay}ms` }}
          />
        ))}

      <div
        style={{
          ...circle(0),
          overflow: "hidden",
          background: `radial-gradient(circle at 34% 28%, ${GOLD_LIGHT} 0%, ${GOLD} 44%, ${GOLD_DEEP} 100%)`,
          boxShadow: `0 0 ${u(180)} rgba(221, 174, 98, 0.2)`,
        }}
      >
        <div
          className="co-sheen"
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at 28% 22%, rgba(255, 248, 232, 0.42), transparent 42%)",
          }}
        />
      </div>

      {HERO.map((product) => (
        <Cutout key={product.id} product={product} />
      ))}
    </div>
  );
}
