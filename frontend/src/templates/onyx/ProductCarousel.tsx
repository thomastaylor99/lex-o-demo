import { labels } from "@/components/i18n";
import type { Language } from "@/lib/events";
import type { ProductGroup } from "@/lib/voice-agent";

import { ProductCard } from "./ProductCard";
import { WHITE, YELLOW } from "./styles";

/** The inline carousel shown in the conversation where a product group appeared. */
export function ProductCarousel({ group, language }: { group: ProductGroup; language: Language }) {
  const l = labels(language);
  const routine = group.kind === "routine";

  return (
    <section className="ox-rise" style={{ margin: "10px 0 6px" }}>
      <p style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 24, fontWeight: 700, color: WHITE, marginBottom: 2 }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: YELLOW }} />
        {routine ? l.completeRoutine : l.selectedForYou}
      </p>
      <div className="ox-scroll" style={{ display: "flex", gap: 20, overflowX: "auto", padding: "22px 24px 28px", margin: "0 -24px" }}>
        {group.products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            top={product.id === group.bestMatchId}
            routine={routine}
            language={language}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}
