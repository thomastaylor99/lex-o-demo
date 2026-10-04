import { formatPrice } from "@/components/i18n";
import type { Language, ProductView } from "@/lib/events";

import { AMBER, BODY_TEXT, CARD_SHADOW, MUTED, SURFACE, TEXT } from "./styles";

const TOP_SHADOW = `0 0 0 3px ${AMBER}, 0 18px 40px rgba(255, 154, 60, 0.26)`;
const clamp = (lines: number) => ({ display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" }) as const;

function Badge({ label, strong }: { label: string; strong: boolean }) {
  return (
    <span
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        borderRadius: 999,
        padding: "6px 14px",
        fontSize: 15,
        fontWeight: 800,
        background: strong ? AMBER : "#fff",
        color: TEXT,
        boxShadow: strong ? "none" : "0 1px 3px rgba(15, 23, 42, 0.1)",
      }}
    >
      {label}
    </span>
  );
}

/** One product: packshot in a light well, brand, name, the first approved claim quoted, price. */
export function ProductCard({
  product,
  top,
  step,
  index,
  language,
}: {
  product: ProductView;
  top: boolean;
  step: string | null;
  index: number;
  language: Language;
}) {
  const facts = [product.fragrance_free ? "Fragrance-free" : null, product.spf ? `SPF ${product.spf}` : null].filter(Boolean);
  const claim = product.claims[0]?.text;

  return (
    <article
      className="du-in"
      style={{
        animationDelay: `${index * 140}ms`,
        flex: "0 0 292px",
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        borderRadius: 24,
        padding: 14,
        boxShadow: top ? TOP_SHADOW : CARD_SHADOW,
      }}
    >
      <div style={{ position: "relative", height: 200, borderRadius: 18, background: SURFACE, overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/products/${product.id}.png`}
          alt={`${product.brand} ${product.name}`}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", padding: 18, mixBlendMode: "multiply" }}
        />
        {top && <Badge label="Top pick" strong />}
        {!top && step && <Badge label={step} strong={false} />}
      </div>

      <p style={{ fontSize: 15, fontWeight: 600, color: MUTED, marginTop: 14 }}>{product.brand}</p>
      <h4 style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.25, color: TEXT, marginTop: 2, ...clamp(2) }}>{product.name}</h4>
      {claim && (
        <p style={{ fontSize: 16, lineHeight: 1.4, color: BODY_TEXT, marginTop: 8, ...clamp(2) }}>&ldquo;{claim}&rdquo;</p>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 8, marginTop: "auto", paddingTop: 14 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {facts.map((fact) => (
            <span key={fact} style={{ fontSize: 13, fontWeight: 600, color: MUTED, background: SURFACE, borderRadius: 999, padding: "4px 10px" }}>
              {fact}
            </span>
          ))}
        </div>
        <span style={{ fontSize: 23, fontWeight: 800, color: TEXT, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
          {formatPrice(product.price_eur, language)}
        </span>
      </div>
    </article>
  );
}
