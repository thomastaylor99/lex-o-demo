import { formatPrice } from "@/components/i18n";
import type { Basket as BasketState, Language } from "@/lib/events";

import { CARD_SHADOW, CLAMP_2, INK, MUTED, ON_DARK_MUTED, PACKSHOT, QUIET, SURFACE } from "./theme";

/** What the visitor chose: thumbnails, names, prices, and the total in a black pill. */
export function Basket({ basket, language }: { basket: BasketState; language: Language }) {
  const count = basket.items.length;

  return (
    <section style={{ borderRadius: 24, padding: 24, background: "#fff", boxShadow: CARD_SHADOW }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: count ? 10 : 8 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.015em", color: INK }}>Your selection</h2>
        {count > 0 && (
          <span key={count} className="fr-pop" style={{ minWidth: 30, height: 30, display: "grid", placeItems: "center", borderRadius: 999, padding: "0 10px", background: INK, color: "#fff", fontSize: 15, fontWeight: 600 }}>
            {count}
          </span>
        )}
      </div>

      {count === 0 && <p style={{ fontSize: 16, lineHeight: 1.45, color: QUIET }}>Products you choose appear here.</p>}

      {basket.items.map((item) => (
        <div key={item.product_id} className="fr-in" style={{ display: "grid", gridTemplateColumns: "64px 1fr auto", alignItems: "center", gap: 14, padding: "8px 0" }}>
          <span style={{ position: "relative", width: 64, height: 64, borderRadius: 16, background: SURFACE, overflow: "hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/products/${item.product_id}.png`} alt="" style={{ ...PACKSHOT, padding: 7, mixBlendMode: "multiply" }} />
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 14, color: MUTED }}>{item.brand}</span>
            <span style={{ ...CLAMP_2, fontSize: 17, fontWeight: 600, lineHeight: 1.25, color: INK }}>{item.name}</span>
          </span>
          <span style={{ fontSize: 17, fontWeight: 600, color: INK, fontVariantNumeric: "tabular-nums" }}>{formatPrice(item.price_eur, language)}</span>
        </div>
      ))}

      {count > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, borderRadius: 999, padding: "12px 22px", background: INK, color: "#fff" }}>
          <span style={{ fontSize: 16, color: ON_DARK_MUTED }}>Total</span>
          <span key={basket.total_eur} className="fr-pop" style={{ fontSize: 26, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {formatPrice(basket.total_eur, language)}
          </span>
        </div>
      )}
    </section>
  );
}
