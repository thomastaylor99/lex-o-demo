/** A fine film grain over the night: the texture of a printed fragrance campaign. */
export function Grain({ opacity = 0.08 }: { opacity?: number }) {
  return (
    <svg
      aria-hidden
      width="100%"
      height="100%"
      style={{ position: "absolute", inset: 0, opacity, mixBlendMode: "overlay", pointerEvents: "none" }}
    >
      <filter id="ec-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#ec-grain)" />
    </svg>
  );
}
