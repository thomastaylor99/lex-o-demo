import { routineStep } from "@/components/i18n";
import type { Language } from "@/lib/events";
import type { ProductGroup } from "@/lib/voice-agent";

import { ProductCard } from "./ProductCard";
import { AMBER, TEXT } from "./styles";

/** The inline carousel at the point in the conversation where products were shown. */
export function ProductCarousel({ group, language }: { group: ProductGroup; language: Language }) {
  const routine = group.kind === "routine";
  return (
    <section className="du-fade" style={{ alignSelf: "stretch", minWidth: 0, margin: "4px 0" }}>
      <p style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 24, fontWeight: 800, letterSpacing: "-0.01em", color: TEXT, marginBottom: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: AMBER }} />
        {routine ? "Complete your routine" : "Selected for you"}
      </p>
      <div className="du-scroll" style={{ display: "flex", gap: 20, overflowX: "auto", padding: "10px 14px 26px", margin: "0 -14px" }}>
        {group.products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            top={product.id === group.bestMatchId}
            step={routine ? routineStep(product.routine_step, language) : null}
            index={index}
            language={language}
          />
        ))}
      </div>
    </section>
  );
}
