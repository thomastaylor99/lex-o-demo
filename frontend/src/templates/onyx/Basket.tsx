import { formatPrice, labels } from "@/components/i18n";
import type { Basket as BasketState, Language } from "@/lib/events";

import { BUBBLE, CARD, WHITE, WHITE_38, WHITE_64 } from "./styles";

/** The visitor's selection: packshot thumbnails, names, prices and the total. */
export function Basket({ basket, language }: { basket: BasketState; language: Language }) {
  const l = labels(language);
  const count = basket.items.length;

  return (
    <section style={{ background: CARD, borderRadius: 26, padding: 22 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h3 style={{ fontSize: 24, fontWeight: 700, color: WHITE }}>{l.yourSelection}</h3>
        {count > 0 && (
          <span key={count} className="ox-chip" style={{ background: BUBBLE, color: WHITE_64, borderRadius: 999, padding: "4px 12px", fontSize: 15, fontWeight: 600 }}>
            {count} {count === 1 ? "product" : "products"}
          </span>
        )}
      </div>
      {count === 0 && <p style={{ color: WHITE_38, fontSize: 17, lineHeight: 1.4 }}>Products the visitor chooses appear here.</p>}
      {basket.items.map((item) => (
        <div key={item.product_id} className="ox-rise" style={{ display: "grid", gridTemplateColumns: "60px minmax(0, 1fr) auto", gap: 14, alignItems: "center", padding: "6px 0" }}>
          <span style={{ position: "relative", width: 60, height: 60, borderRadius: 16, background: "#FFFFFF", overflow: "hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/products/${item.product_id}.png`}
              alt=""
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", padding: 6, boxSizing: "border-box" }}
            />
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: WHITE_64 }}>{item.brand}</span>
            <span style={{ display: "block", fontSize: 17, fontWeight: 600, lineHeight: 1.25, color: WHITE }}>{item.name}</span>
          </span>
          <span style={{ fontSize: 18, fontWeight: 600, color: WHITE, fontVariantNumeric: "tabular-nums" }}>{formatPrice(item.price_eur, language)}</span>
        </div>
      ))}
      {count > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 12, background: BUBBLE, borderRadius: 18, padding: "14px 18px" }}>
          <span style={{ fontSize: 18, color: WHITE_64 }}>{l.total}</span>
          <span key={basket.total_eur} className="ox-in" style={{ fontSize: 30, fontWeight: 700, color: WHITE, fontVariantNumeric: "tabular-nums" }}>
            {formatPrice(basket.total_eur, language)}
          </span>
        </div>
      )}
    </section>
  );
}
