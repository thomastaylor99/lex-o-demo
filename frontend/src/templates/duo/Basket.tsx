import { formatPrice } from "@/components/i18n";
import type { Basket as BasketData, Language } from "@/lib/events";

import { AMBER, darkCard, ON_DARK, ON_DARK_FAINT, ON_DARK_MUTED, TEXT } from "./styles";

const clamp2 = { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as const;

/** What the visitor chose: white thumbnail wells on the dark card, prices, and the total in amber. */
export function Basket({ basket, language }: { basket: BasketData; language: Language }) {
  const count = basket.items.length;
  return (
    <section style={darkCard}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: ON_DARK }}>Basket</h3>
        <span
          key={count}
          className="du-fade"
          style={{ minWidth: 30, height: 30, padding: "0 10px", borderRadius: 999, display: "grid", placeItems: "center", fontSize: 15, fontWeight: 800, background: count ? AMBER : "rgba(255, 255, 255, 0.08)", color: count ? TEXT : ON_DARK_MUTED }}
        >
          {count}
        </span>
      </div>

      {count === 0 && <p style={{ fontSize: 15, lineHeight: 1.45, color: ON_DARK_FAINT, padding: "4px 0 2px" }}>Products the visitor chooses appear here.</p>}

      {basket.items.map((item) => (
        <div key={item.product_id} className="du-in" style={{ display: "grid", gridTemplateColumns: "58px 1fr auto", gap: 14, alignItems: "center", padding: "7px 0" }}>
          <span style={{ position: "relative", width: 58, height: 58, borderRadius: 16, background: "#fff", overflow: "hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/products/${item.product_id}.png`} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", padding: 6 }} />
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: ON_DARK_MUTED }}>{item.brand}</span>
            <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25, color: ON_DARK, ...clamp2 }}>{item.name}</span>
          </span>
          <span style={{ fontSize: 16, fontWeight: 700, color: ON_DARK, fontVariantNumeric: "tabular-nums" }}>{formatPrice(item.price_eur, language)}</span>
        </div>
      ))}

      {count > 0 && (
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 10, padding: "12px 16px", borderRadius: 16, background: "rgba(255, 255, 255, 0.04)" }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: ON_DARK_MUTED }}>Total</span>
          <span key={basket.total_eur} className="du-fade" style={{ fontSize: 28, fontWeight: 800, color: AMBER, fontVariantNumeric: "tabular-nums" }}>
            {formatPrice(basket.total_eur, language)}
          </span>
        </div>
      )}
    </section>
  );
}
