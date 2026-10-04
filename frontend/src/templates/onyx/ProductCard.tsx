import { formatPrice, labels, routineStep } from "@/components/i18n";
import type { Language, ProductView } from "@/lib/events";

import { BUBBLE, RAISED, WHITE, WHITE_38, WHITE_64, YELLOW } from "./styles";

const clamp = (lines: number) =>
  ({ display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" }) as const;

/** One product: white packshot well, brand, name, the first approved claim, price. The top pick is ringed in yellow. */
export function ProductCard(props: { product: ProductView; top: boolean; routine: boolean; language: Language; index: number }) {
  const { product, top, routine, language, index } = props;
  const l = labels(language);
  const facts = [product.spf ? `SPF ${product.spf}` : null, product.fragrance_free ? l.fragranceFree : null].filter(
    (fact): fact is string => fact !== null,
  );
  const chip = top ? l.topPick : routine ? routineStep(product.routine_step, language) : null;

  return (
    <article
      className="ox-rise"
      style={{
        animationDelay: `${index * 140}ms`,
        flex: "0 0 300px",
        display: "flex",
        flexDirection: "column",
        background: RAISED,
        borderRadius: 24,
        padding: 14,
        boxShadow: top ? `0 0 0 2px ${YELLOW}, 0 0 24px rgba(255, 200, 61, 0.25)` : "none",
      }}
    >
      <div style={{ position: "relative", height: 172, background: "#FFFFFF", borderRadius: 18, overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/products/${product.id}.png`}
          alt={`${product.brand} ${product.name}`}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", padding: 16, boxSizing: "border-box" }}
        />
        {chip && (
          <span
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              borderRadius: 999,
              padding: "5px 12px",
              fontSize: 15,
              fontWeight: 700,
              background: top ? YELLOW : "#0B0B0C",
              color: top ? "#0B0B0C" : WHITE,
            }}
          >
            {chip}
          </span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "14px 6px 2px" }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: WHITE_64 }}>{product.brand}</p>
        <h4 style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.25, color: WHITE, marginTop: 4, ...clamp(2) }}>{product.name}</h4>
        {product.claims[0] && (
          <p style={{ fontSize: 16, lineHeight: 1.4, color: WHITE_64, marginTop: 8, ...clamp(2) }}>&ldquo;{product.claims[0].text}&rdquo;</p>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: "auto", paddingTop: 12 }}>
          <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {facts.map((fact) => (
              <span key={fact} style={{ fontSize: 13, fontWeight: 600, color: WHITE_38, background: BUBBLE, borderRadius: 999, padding: "4px 10px" }}>
                {fact}
              </span>
            ))}
          </span>
          <span style={{ fontSize: 23, fontWeight: 700, color: WHITE, fontVariantNumeric: "tabular-nums" }}>
            {formatPrice(product.price_eur, language)}
          </span>
        </div>
      </div>
    </article>
  );
}
