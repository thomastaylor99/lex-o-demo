import { formatPrice } from "@/components/i18n";
import type { Language, ProductView } from "@/lib/events";

import { CLAMP_2, INK, MUTED, ON_DARK_MUTED, PACKSHOT, SURFACE, YELLOW } from "./theme";

const CHIP = { position: "absolute", top: 12, left: 12, borderRadius: 999, padding: "6px 13px", fontSize: 14, fontWeight: 600 } as const;

/** One product: packshot on a white well, brand, name, the first approved claim and the price. The top pick turns black. */
export function ProductCard(props: { product: ProductView; top: boolean; step: string | null; language: Language; delayMs: number }) {
  const { product, top, step, language, delayMs } = props;
  const claim = product.claims[0]?.text;

  return (
    <article
      className="fr-in"
      style={{
        animationDelay: `${delayMs}ms`,
        flex: "0 0 284px",
        display: "flex",
        flexDirection: "column",
        borderRadius: 24,
        padding: 12,
        background: top ? INK : SURFACE,
        color: top ? "#fff" : INK,
        boxShadow: top ? "0 18px 40px rgba(11, 11, 12, 0.2)" : "none",
      }}
    >
      <div style={{ position: "relative", height: 184, borderRadius: 14, background: "#fff", overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/products/${product.id}.png`} alt={`${product.brand} ${product.name}`} style={{ ...PACKSHOT, padding: 16 }} />
        {top && <span style={{ ...CHIP, background: YELLOW, color: INK }}>Top pick</span>}
        {step && <span style={{ ...CHIP, ...(top ? { left: "auto", right: 12 } : {}), background: INK, color: "#fff" }}>{step}</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "14px 8px 6px" }}>
        <p style={{ fontSize: 15, color: top ? ON_DARK_MUTED : MUTED }}>{product.brand}</p>
        <h4 style={{ ...CLAMP_2, fontSize: 20, fontWeight: 600, lineHeight: 1.25, letterSpacing: "-0.01em", marginTop: 3 }}>{product.name}</h4>
        {claim && (
          <p style={{ ...CLAMP_2, fontSize: 16, lineHeight: 1.4, color: top ? "#D6D9DE" : "#4A4F57", marginTop: 8 }}>
            &ldquo;{claim}&rdquo;
          </p>
        )}
        <p style={{ marginTop: "auto", paddingTop: 14, fontSize: 23, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
          {formatPrice(product.price_eur, language)}
        </p>
      </div>
    </article>
  );
}
