import type { CSSProperties } from "react";

import { formatPrice, routineStep } from "@/components/i18n";
import type { Language, ProductView } from "@/lib/events";

import { AMBER, EDGE, FAINT, MUTED, ON_AMBER, TEXT, WELL } from "./theme";

const clamp = (lines: number): CSSProperties => ({
  display: "-webkit-box",
  WebkitLineClamp: lines,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
});

const badge: CSSProperties = { position: "absolute", top: 12, left: 12, borderRadius: 999, padding: "6px 14px", fontSize: 15, fontWeight: 700 };

/** One product: packshot on a light well, brand, name, the first approved claim quoted, the price. */
export function ProductCard({
  product,
  top,
  step,
  index,
  language,
}: {
  product: ProductView;
  top: boolean;
  step: boolean;
  index: number;
  language: Language;
}) {
  const facts = [product.spf ? `SPF ${product.spf}` : null, product.fragrance_free ? "Fragrance-free" : null].filter(
    (fact): fact is string => fact !== null,
  );
  const claim = product.claims[0]?.text;

  return (
    <article
      className="em-rise"
      style={{
        animationDelay: `${index * 140}ms`,
        flex: "0 0 292px",
        display: "flex",
        flexDirection: "column",
        padding: 12,
        borderRadius: 26,
        background: top ? "rgba(255, 154, 60, 0.08)" : "rgba(255, 255, 255, 0.05)",
        border: `2px solid ${top ? AMBER : EDGE}`,
      }}
    >
      <div style={{ position: "relative", height: 176, borderRadius: 18, background: WELL, overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/products/${product.id}.png`}
          alt={`${product.brand} ${product.name}`}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", padding: 16, mixBlendMode: "multiply" }}
        />
        {top && <span style={{ ...badge, background: AMBER, color: ON_AMBER }}>Top pick</span>}
        {!top && step && (
          <span style={{ ...badge, background: "rgba(14, 15, 18, 0.82)", color: TEXT }}>{routineStep(product.routine_step, language)}</span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "14px 8px 6px" }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: MUTED }}>{product.brand}</p>
        <h4 style={{ ...clamp(2), fontSize: 20, fontWeight: 700, lineHeight: 1.25, color: TEXT, marginTop: 2 }}>{product.name}</h4>
        {claim && (
          <p style={{ ...clamp(2), fontSize: 16, lineHeight: 1.4, color: MUTED, marginTop: 8 }}>&ldquo;{claim}&rdquo;</p>
        )}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8, marginTop: "auto", paddingTop: 12 }}>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {facts.map((fact) => (
              <span key={fact} style={{ fontSize: 13, fontWeight: 600, color: FAINT, border: `1px solid ${EDGE}`, borderRadius: 999, padding: "3px 10px" }}>
                {fact}
              </span>
            ))}
          </span>
          <span style={{ fontSize: 22, fontWeight: 700, color: top ? AMBER : TEXT, fontVariantNumeric: "tabular-nums" }}>
            {formatPrice(product.price_eur, language)}
          </span>
        </div>
      </div>
    </article>
  );
}
