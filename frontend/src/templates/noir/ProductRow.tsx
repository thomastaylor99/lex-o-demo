import { formatPrice, routineStep } from "@/components/i18n";
import type { Language } from "@/lib/events";
import type { ProductGroup } from "@/lib/voice-agent";

import { BODY, CHAMPAGNE, CHAMPAGNE_LINE, DISPLAY, HAIRLINE, IVORY, MUTED, PANEL } from "./styles";

/** An inline carousel: products framed on ivory like a vitrine, the top pick lit in champagne. */
export function ProductRow({ group, language }: { group: ProductGroup; language: Language }) {
  const routine = group.kind === "routine";
  return (
    <section className="nr-fade" style={{ margin: "4px 0 8px" }}>
      <p style={{ fontFamily: DISPLAY, fontSize: 26, color: CHAMPAGNE, marginBottom: 16 }}>
        {routine ? "To complete your ritual" : "Chosen for you"}
      </p>
      <div className="nr-scroll" style={{ display: "flex", gap: 20, overflowX: "auto", padding: "2px 2px 12px" }}>
        {group.products.map((product, index) => {
          const top = product.id === group.bestMatchId;
          return (
            <article
              key={product.id}
              className="nr-pop"
              style={{
                animationDelay: `${index * 150}ms`,
                flex: "0 0 280px",
                background: PANEL,
                border: `1px solid ${top ? CHAMPAGNE : HAIRLINE}`,
                boxShadow: top ? "0 0 40px rgba(201, 169, 110, 0.16)" : "none",
                borderRadius: 4,
                padding: 12,
                fontFamily: BODY,
              }}
            >
              <div style={{ position: "relative", height: 200, background: IVORY, borderRadius: 2 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/products/${product.id}.png`} alt={`${product.brand} ${product.name}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", padding: 16, mixBlendMode: "multiply" }} />
              </div>
              <div style={{ padding: "14px 4px 4px" }}>
                <p style={{ display: "flex", justifyContent: "space-between", fontSize: 13, letterSpacing: "0.06em", color: CHAMPAGNE }}>
                  <span>{product.brand}</span>
                  {(top || routine) && <span>{top ? "Top pick" : routineStep(product.routine_step, language)}</span>}
                </p>
                <h4 style={{ fontFamily: DISPLAY, fontSize: 25, lineHeight: 1.12, color: IVORY, marginTop: 6 }}>{product.name}</h4>
                {product.claims[0] && (
                  <p style={{ fontSize: 14, fontStyle: "italic", lineHeight: 1.45, color: MUTED, marginTop: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {product.claims[0].text}
                  </p>
                )}
                <p style={{ fontSize: 17, color: IVORY, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${CHAMPAGNE_LINE}`, fontVariantNumeric: "tabular-nums" }}>
                  {formatPrice(product.price_eur, language)}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
