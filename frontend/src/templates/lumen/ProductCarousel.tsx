import { routineStep } from "@/components/i18n";
import type { Language } from "@/lib/events";
import type { ProductGroup } from "@/lib/voice-agent";

import { ProductCard } from "./ProductCard";
import { DISPLAY, MUTED, TEXT } from "./theme";

/** An inline row of product cards at the point in the conversation where they were shown. */
export function ProductCarousel({ group, basketIds, language }: { group: ProductGroup; basketIds: Set<string>; language: Language }) {
  const routine = group.kind === "routine";
  return (
    <section className="lm-fade" style={{ alignSelf: "stretch", minWidth: 0, marginTop: 4 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 8 }}>
        <h3 style={{ fontFamily: DISPLAY, fontSize: 32, lineHeight: 1.1, color: TEXT }}>
          {routine ? "Complete your routine" : "Selected for you"}
        </h3>
        <span style={{ fontSize: 16, color: MUTED }}>Claims quoted from each brand&rsquo;s product page</span>
      </div>
      <div className="lm-scroll" style={{ display: "flex", gap: 18, overflowX: "auto", padding: "8px 8px 26px", margin: "0 -8px" }}>
        {group.products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            top={product.id === group.bestMatchId}
            step={routine ? routineStep(product.routine_step, language) : null}
            inBasket={basketIds.has(product.id)}
            index={index}
            language={language}
          />
        ))}
      </div>
    </section>
  );
}
