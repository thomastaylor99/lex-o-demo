import { formatPrice, routineStep } from "@/components/i18n";
import type { Language } from "@/lib/events";
import type { ProductGroup } from "@/lib/voice-agent";

import { GREY, INK, RED, SANS, SERIF, WELL } from "./styles";

/** An inline carousel inside the conversation: numbered lookbook cards, the top pick ruled in red. */
export function ProductRow({ group, language }: { group: ProductGroup; language: Language }) {
  const routine = group.kind === "routine";
  return (
    <section className="at-fade" style={{ margin: "8px 0 4px" }}>
      <p style={{ fontFamily: SERIF, fontSize: 24, fontStyle: "italic", color: INK, marginBottom: 14 }}>
        {routine ? "Complete your routine" : "Selected for you"}
      </p>
      <div className="at-scroll" style={{ display: "flex", gap: 20, overflowX: "auto", paddingBottom: 6 }}>
        {group.products.map((product, index) => {
          const top = product.id === group.bestMatchId;
          return (
            <article
              key={product.id}
              className="at-pop"
              style={{
                animationDelay: `${index * 140}ms`,
                flex: "0 0 290px",
                borderTop: `2px solid ${top ? RED : INK}`,
                paddingTop: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: SANS, fontSize: 13, color: GREY }}>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{String(index + 1).padStart(2, "0")}</span>
                <span style={{ color: top ? RED : GREY }}>
                  {top ? "Top pick" : routine ? routineStep(product.routine_step, language) : ""}
                </span>
              </div>
              <div style={{ position: "relative", height: 210, background: WELL, marginTop: 10 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/products/${product.id}.png`}
                  alt={`${product.brand} ${product.name}`}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", padding: 16, mixBlendMode: "multiply" }}
                />
              </div>
              <p style={{ fontFamily: SANS, fontSize: 13, color: GREY, marginTop: 12 }}>{product.brand}</p>
              <h4 style={{ fontFamily: SERIF, fontSize: 23, lineHeight: 1.15, color: INK, marginTop: 2 }}>{product.name}</h4>
              {product.claims[0] && (
                <p
                  style={{
                    fontFamily: SERIF,
                    fontStyle: "italic",
                    fontSize: 16,
                    lineHeight: 1.35,
                    color: "#3A3A3A",
                    marginTop: 8,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {product.claims[0].text}
                </p>
              )}
              <p style={{ fontFamily: SANS, fontSize: 17, color: INK, marginTop: 10, fontVariantNumeric: "tabular-nums" }}>
                {formatPrice(product.price_eur, language)}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
