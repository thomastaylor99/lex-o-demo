import { formatPrice, routineStep } from "@/components/i18n";
import type { Language, ProductView } from "@/lib/events";
import type { ProductGroup } from "@/lib/voice-agent";

import { BLUE, BLUE_TINT, BODY, CARD_SHADOW, DISPLAY, LINE, MUTED, SURFACE, TEXT } from "./styles";

function Facts({ product }: { product: ProductView }) {
  const facts = [product.fragrance_free ? "Fragrance-free" : null, product.spf ? `SPF ${product.spf}` : null].filter(Boolean);
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", minHeight: 26 }}>
      {facts.map((fact) => (
        <span key={fact} style={{ fontSize: 12, color: MUTED, border: `1px solid ${LINE}`, borderRadius: 999, padding: "3px 10px" }}>
          {fact}
        </span>
      ))}
    </div>
  );
}

/** An inline carousel inside the conversation: rounded clinical cards, the top pick badged in blue. */
export function ProductRow({ group, language }: { group: ProductGroup; language: Language }) {
  const routine = group.kind === "routine";
  return (
    <section className="cl-fade">
      <p style={{ fontFamily: DISPLAY, fontSize: 24, color: TEXT, margin: "4px 0 14px" }}>
        {routine ? "Complete your routine" : "Selected for you"}
      </p>
      <div className="cl-scroll" style={{ display: "flex", gap: 18, overflowX: "auto", padding: "4px 4px 14px" }}>
        {group.products.map((product, index) => {
          const top = product.id === group.bestMatchId;
          return (
            <article
              key={product.id}
              className="cl-pop"
              style={{
                animationDelay: `${index * 130}ms`,
                flex: "0 0 280px",
                background: "#fff",
                borderRadius: 22,
                boxShadow: CARD_SHADOW,
                outline: top ? `2px solid ${BLUE}` : "none",
                padding: 14,
                fontFamily: BODY,
              }}
            >
              <div style={{ position: "relative", height: 190, background: SURFACE, borderRadius: 16 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/products/${product.id}.png`} alt={`${product.brand} ${product.name}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", padding: 14, mixBlendMode: "multiply" }} />
                {(top || routine) && (
                  <span style={{ position: "absolute", top: 10, left: 10, fontSize: 12, fontWeight: 600, borderRadius: 999, padding: "4px 10px", background: top ? BLUE : BLUE_TINT, color: top ? "#fff" : BLUE }}>
                    {top ? "Top pick" : routineStep(product.routine_step, language)}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 13, color: MUTED, marginTop: 12 }}>{product.brand}</p>
              <h4 style={{ fontSize: 18, fontWeight: 600, color: TEXT, lineHeight: 1.25, marginTop: 2 }}>{product.name}</h4>
              {product.claims[0] && (
                <p style={{ fontSize: 14, lineHeight: 1.4, color: "#334155", marginTop: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  &ldquo;{product.claims[0].text}&rdquo;
                </p>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 12, gap: 8 }}>
                <Facts product={product} />
                <span style={{ fontSize: 19, fontWeight: 700, color: TEXT, fontVariantNumeric: "tabular-nums" }}>{formatPrice(product.price_eur, language)}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
