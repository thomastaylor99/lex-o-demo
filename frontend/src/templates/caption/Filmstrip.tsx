import { formatPrice, routineStep } from "@/components/i18n";
import type { Language } from "@/lib/events";
import type { ProductGroup } from "@/lib/voice-agent";

import { BLACK, DISPLAY, GREY, MONO, NARROW, RULE, WELL } from "./styles";

/** Products as a filmstrip of square frames inside the captions; the top pick gets the thick frame. */
export function Filmstrip({ group, language }: { group: ProductGroup; language: Language }) {
  const routine = group.kind === "routine";
  return (
    <section className="cp-fade" style={{ margin: "6px 0 10px" }}>
      <p style={{ fontFamily: MONO, fontSize: 14, color: GREY, marginBottom: 12 }}>
        {routine ? "Complete the routine" : "Selected for you"}, {group.products.length} products
      </p>
      <div className="cp-scroll" style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 6 }}>
        {group.products.map((product, index) => {
          const top = product.id === group.bestMatchId;
          return (
            <article key={product.id} className="cp-rise" style={{ animationDelay: `${index * 120}ms`, flex: "0 0 250px" }}>
              <div style={{ position: "relative", width: 250, height: 250, background: WELL, boxShadow: `inset 0 0 0 ${top ? 6 : 1}px ${top ? BLACK : RULE}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/products/${product.id}.png`} alt={`${product.brand} ${product.name}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", padding: 26, mixBlendMode: "multiply" }} />
                <span style={{ position: "absolute", left: 0, bottom: 0, fontFamily: MONO, fontSize: 12, padding: "5px 9px", background: top ? BLACK : "transparent", color: top ? "#fff" : GREY }}>
                  {top ? "Top pick" : routine ? routineStep(product.routine_step, language) : `0${index + 1}`}
                </span>
              </div>
              <p style={{ fontFamily: MONO, fontSize: 12, color: GREY, marginTop: 10 }}>{product.brand}</p>
              <h4 style={{ fontFamily: DISPLAY, fontVariationSettings: NARROW, fontWeight: 600, fontSize: 21, lineHeight: 1.15, marginTop: 2 }}>{product.name}</h4>
              <p style={{ fontFamily: MONO, fontSize: 15, marginTop: 6 }}>{formatPrice(product.price_eur, language)}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
