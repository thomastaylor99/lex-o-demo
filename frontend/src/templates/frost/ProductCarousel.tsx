import { routineStep } from "@/components/i18n";
import type { Language } from "@/lib/events";
import type { ProductGroup } from "@/lib/voice-agent";

import { ProductCard } from "./ProductCard";
import { INK } from "./theme";

/** The products, inline at the point of the conversation where they appeared. */
export function ProductCarousel({ group, language }: { group: ProductGroup; language: Language }) {
  const routine = group.kind === "routine";

  return (
    <section className="fr-in" style={{ alignSelf: "stretch", minWidth: 0, margin: "8px 0 0" }}>
      <h3 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.015em", color: INK, marginBottom: 14 }}>
        {routine ? "Complete your routine" : "Selected for you"}
      </h3>
      {/* Padding gives the top pick's shadow room; the negative margin keeps the cards aligned with the title. */}
      <div className="fr-scroll" style={{ display: "flex", gap: 16, overflowX: "auto", padding: "4px 24px 30px", margin: "0 -24px -22px" }}>
        {group.products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            top={product.id === group.bestMatchId}
            step={routine ? routineStep(product.routine_step, language) : null}
            language={language}
            delayMs={140 + index * 130}
          />
        ))}
      </div>
    </section>
  );
}
