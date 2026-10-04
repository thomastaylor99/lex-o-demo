import type { Language } from "@/lib/events";
import type { ProductGroup } from "@/lib/voice-agent";

import { ProductCard } from "./ProductCard";
import { AMBER, FAINT, TEXT } from "./theme";

/** The inline carousel at the point in the conversation where the products appeared. */
export function ProductCarousel({ group, language }: { group: ProductGroup; language: Language }) {
  const routine = group.kind === "routine";
  return (
    <section className="em-fade" style={{ alignSelf: "stretch", margin: "4px 0" }}>
      <p style={{ display: "flex", alignItems: "baseline", gap: 12, margin: "0 0 12px 6px" }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: AMBER, alignSelf: "center" }} />
        <span style={{ fontSize: 22, fontWeight: 700, color: TEXT }}>{routine ? "Complete your routine" : "Selected for you"}</span>
        <span style={{ fontSize: 16, color: FAINT }}>
          {group.products.length} {group.products.length === 1 ? "product" : "products"}
        </span>
      </p>
      <div className="em-scroll" style={{ display: "flex", gap: 16, overflowX: "auto", padding: "2px 2px 6px" }}>
        {group.products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            top={product.id === group.bestMatchId}
            step={routine}
            index={index}
            language={language}
          />
        ))}
      </div>
    </section>
  );
}
