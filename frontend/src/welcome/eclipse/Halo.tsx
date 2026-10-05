import { gold, GOLD_LIGHT } from "./theme";

const FILL = { position: "absolute", inset: 0, borderRadius: "50%" } as const;

/** Wide warm light around the rim: the part that breathes like a voice. */
const BLOOM = `radial-gradient(closest-side, transparent 50%, ${gold(0.24)} 57%, ${gold(0.09)} 72%, transparent 100%)`;

/** Uneven streamers of light, blurred into a corona and turned very slowly. */
const CORONA = `conic-gradient(from 12deg, ${gold(0.55)}, ${gold(0.16)} 38deg, ${gold(0.48)} 74deg, ${gold(0.12)} 118deg, ${gold(0.4)} 158deg, ${gold(0.2)} 204deg, ${gold(0.6)} 248deg, ${gold(0.14)} 292deg, ${gold(0.44)} 328deg, ${gold(0.55)})`;
const CORONA_MASK = "radial-gradient(closest-side, transparent 76%, #000 81%, rgba(0, 0, 0, 0.35) 90%, transparent 100%)";

/** The moon: near-black, faintly warmer at the top, with a thin golden rim and light spilling inwards. */
const DISC = "radial-gradient(circle at 50% 36%, #130E08 0%, #080605 52%, #030303 100%)";
const DISC_SHADOW = [
  `0 0 0 1.5px ${gold(0.8)}`,
  `0 0 16px 1px ${gold(0.5)}`,
  `0 0 54px 6px ${gold(0.2)}`,
  `inset 0 0 28px 1px ${gold(0.2)}`,
  `inset 0 0 120px 0 ${gold(0.05)}`,
].join(", ");

/** A comet of light whose bright head leads as it turns clockwise around the rim. */
const ARC = `conic-gradient(from 0deg, transparent 0deg 210deg, ${gold(0.22)} 260deg, ${gold(0.85)} 318deg, ${GOLD_LIGHT} 338deg, #FFFFFF 345deg, transparent 352deg)`;

/** Cuts a square box down to a band of the given width along its circular edge. */
const rim = (width: number): string =>
  `radial-gradient(farthest-side, transparent calc(100% - ${width}px), #000 calc(100% - ${width - 1}px), #000 calc(100% - 1px), transparent 100%)`;

/**
 * The eclipse, filling its square parent: a black disc rimmed in gold, a corona, a wide bloom that
 * breathes, and a bright arc travelling the rim. Starting speeds everything up (see css.ts).
 */
export function Halo() {
  return (
    <div aria-hidden className="ec-ignite" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div className="ec-breathe" style={{ ...FILL, inset: "-36%", background: BLOOM }} />
      <div
        className="ec-breathe"
        style={{ ...FILL, inset: "-6%", border: `1px solid ${gold(0.16)}`, animationDelay: "-3.2s" }}
      />

      <div className="ec-orbit" style={{ ...FILL, inset: "-12%", filter: "blur(16px)" }}>
        <div style={{ ...FILL, background: CORONA, mask: CORONA_MASK, WebkitMask: CORONA_MASK }} />
      </div>

      <div style={{ ...FILL, background: DISC, boxShadow: DISC_SHADOW }} />

      <div className="ec-arc" style={{ ...FILL, inset: -3 }}>
        <div style={{ ...FILL, filter: "blur(7px)" }}>
          <div style={{ ...FILL, background: ARC, mask: rim(10), WebkitMask: rim(10) }} />
        </div>
        <div style={{ ...FILL, background: ARC, mask: rim(4), WebkitMask: rim(4) }} />
      </div>
    </div>
  );
}
