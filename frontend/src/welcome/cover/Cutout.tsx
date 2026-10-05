import type { HeroProduct } from "./products";
import { u } from "./theme";

/** A warm studio shadow on the gold: one wide and soft, one close to the product. */
const SHADOW =
  "drop-shadow(0 calc(var(--co-u) * 30) calc(var(--co-u) * 30) rgba(52, 28, 4, 0.42)) " +
  "drop-shadow(0 calc(var(--co-u) * 6) calc(var(--co-u) * 8) rgba(52, 28, 4, 0.3))";

/**
 * One packshot as a cut-out: the frame is the product's tight box, the image sits inside it at
 * the same scale, and the traced clip-path removes the white around the product. The shadow is
 * on the frame, so it follows the silhouette.
 */
export function Cutout({ product }: { product: HeroProduct }) {
  const [imageWidth, imageHeight] = product.image;
  const [left, top, width, height] = product.box;
  const scale = product.height / height;
  const [floatSeconds, floatOffset] = product.float;

  return (
    <div
      className="co-float"
      style={{
        position: "absolute",
        left: u(product.centre - (width * scale) / 2),
        top: u(product.bottom - product.height),
        width: u(width * scale),
        height: u(product.height),
        zIndex: product.layer,
        rotate: `${product.tilt}deg`,
        transformOrigin: "50% 100%",
        filter: SHADOW,
        animationDuration: `${floatSeconds}s`,
        animationDelay: `${floatOffset}s`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static packshots, clipped to their silhouette */}
      <img
        src={`/products/${product.id}.png`}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          left: u(-left * scale),
          top: u(-top * scale),
          width: u(imageWidth * scale),
          height: u(imageHeight * scale),
          maxWidth: "none",
          clipPath: product.clip,
          userSelect: "none",
        }}
      />
    </div>
  );
}
