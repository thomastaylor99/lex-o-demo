import { labels, routineStep } from "@/components/i18n";
import type { Language } from "@/lib/events";
import type { ProductGroup } from "@/lib/voice-agent";

import { ProductCard } from "./ProductCard";
import { INK, fs } from "./theme";

/** The products, inline at the point of the conversation where they appeared. An empty group shows nothing. */
export function ProductCarousel({ group, language }: { group: ProductGroup; language: Language }) {
  if (group.products.length === 0) return null;
  const l = labels(language);
  const routine = group.kind === "routine";

  return (
    <section className="fr-in" style={{ alignSelf: "stretch", minWidth: 0, margin: "6px 0 0" }}>
      <h3 style={{ fontSize: fs(24), fontWeight: 600, letterSpacing: "-0.015em", color: INK, marginBottom: 12 }}>
        {routine ? l.completeRoutine : l.selectedForYou}
      </h3>
      {/* Padding gives the top pick's shadow room; the negative margin keeps the cards aligned with the title. */}
      <div className="fr-scroll" style={{ display: "flex", gap: 14, overflowX: "auto", padding: "4px 24px 28px", margin: "0 -24px -20px" }}>
        {group.products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            top={product.id === group.bestMatchId}
            step={routine ? routineStep(product.routine_step, language) : null}
            language={language}
            delayMs={120 + index * 110}
          />
        ))}
      </div>
    </section>
  );
}
