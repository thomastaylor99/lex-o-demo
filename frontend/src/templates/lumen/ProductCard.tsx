import { formatPrice } from "@/components/i18n";
import type { Language, ProductView } from "@/lib/events";

import { AMBER, AMBER_SHADOW, AMBER_TINT, CARD_SHADOW, INK_SOFT, LINE, MUTED, SURFACE, TEXT, WHITE, productImage } from "./theme";

const CLAMP = { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as const;
const PILL = { position: "absolute", top: 12, borderRadius: 999, padding: "5px 12px", fontSize: 14, fontWeight: 700 } as const;

function quote(text: string, language: Language): string {
  return language === "fr" ? `« ${text} »` : `“${text}”`;
}

/** One product: packshot on a light well, brand, name, the first approved claim, price. */
export function ProductCard(props: {
  product: ProductView;
  top: boolean;
  step: string | null;
  inBasket: boolean;
  index: number;
  language: Language;
}) {
  const { product, top, step, inBasket, index, language } = props;
  const facts = [product.fragrance_free ? "Fragrance-free" : null, product.spf ? `SPF ${product.spf}` : null].filter(
    (fact): fact is string => fact !== null,
  );
  const claim = product.claims[0]?.text;

  return (
    <article
      className="lm-pop"
      style={{
        animationDelay: `${index * 130}ms`,
        flex: "0 0 288px",
        display: "flex",
        flexDirection: "column",
        background: WHITE,
        borderRadius: 24,
        padding: 14,
        boxShadow: top ? `0 0 0 3px ${AMBER}, ${AMBER_SHADOW}` : CARD_SHADOW,
      }}
    >
      <div style={{ position: "relative", height: 186, borderRadius: 18, background: SURFACE, overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={productImage(product.id)}
          alt={`${product.brand} ${product.name}`}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", padding: 16, mixBlendMode: "multiply" }}
        />
        {top && (
          <span style={{ ...PILL, left: 12, background: AMBER, color: TEXT, display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden fill={TEXT}>
              <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
            </svg>
            Top pick
          </span>
        )}
        {!top && step && <span style={{ ...PILL, left: 12, background: AMBER_TINT, color: TEXT }}>{step}</span>}
        {inBasket && (
          <span className="lm-pop" style={{ ...PILL, right: 12, background: TEXT, color: WHITE, display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden fill="none" stroke={AMBER} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
            Added
          </span>
        )}
      </div>
      <p style={{ fontSize: 15, color: MUTED, marginTop: 14 }}>{product.brand}</p>
      <h4 style={{ ...CLAMP, fontSize: 20, fontWeight: 600, lineHeight: 1.25, color: TEXT, marginTop: 2 }}>{product.name}</h4>
      {claim && <p style={{ ...CLAMP, fontSize: 16, lineHeight: 1.4, color: INK_SOFT, marginTop: 8 }}>{quote(claim, language)}</p>}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8, marginTop: "auto", paddingTop: 14 }}>
        <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {facts.map((fact) => (
            <span key={fact} style={{ fontSize: 13, color: MUTED, border: `1px solid ${LINE}`, borderRadius: 999, padding: "3px 10px" }}>
              {fact}
            </span>
          ))}
        </span>
        <span style={{ fontSize: 22, fontWeight: 700, color: TEXT, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
          {formatPrice(product.price_eur, language)}
        </span>
      </div>
    </article>
  );
}
