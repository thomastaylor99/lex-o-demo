import { formatPrice } from "@/components/i18n";
import type { Basket as BasketData, Language } from "@/lib/events";

import { FAINT, MUTED, TEXT, WELL, glass } from "./theme";

/** The visitor's selection: thumbnails, names, prices and the running total. */
export function Basket({ basket, language }: { basket: BasketData; language: Language }) {
  const count = basket.items.length;
  return (
    <section style={{ ...glass(28), padding: 22 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "0 4px 14px" }}>
        <h3 style={{ fontSize: 24, fontWeight: 700, color: TEXT }}>Your selection</h3>
        <span style={{ fontSize: 16, color: FAINT }}>
          {count} {count === 1 ? "item" : "items"}
        </span>
      </header>

      {count === 0 && <p style={{ fontSize: 17, lineHeight: 1.45, color: FAINT, margin: "0 4px" }}>Products the visitor chooses appear here.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {basket.items.map((item) => (
          <div
            key={item.product_id}
            className="em-rise"
            style={{ display: "grid", gridTemplateColumns: "60px 1fr auto", gap: 14, alignItems: "center", padding: 8, borderRadius: 20, background: "rgba(255, 255, 255, 0.04)" }}
          >
            <span style={{ position: "relative", display: "block", width: 60, height: 60, borderRadius: 16, background: WELL, overflow: "hidden" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/products/${item.product_id}.png`}
                alt=""
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", padding: 6, mixBlendMode: "multiply" }}
              />
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: MUTED }}>{item.brand}</span>
              <span
                style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: 17, fontWeight: 600, lineHeight: 1.25, color: TEXT }}
              >
                {item.name}
              </span>
            </span>
            <span style={{ fontSize: 18, fontWeight: 700, color: TEXT, fontVariantNumeric: "tabular-nums", paddingRight: 6 }}>
              {formatPrice(item.price_eur, language)}
            </span>
          </div>
        ))}
      </div>

      {count > 0 && (
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 12, padding: "14px 16px", borderRadius: 18, background: "rgba(255, 255, 255, 0.06)" }}
        >
          <span style={{ fontSize: 18, fontWeight: 600, color: MUTED }}>Total</span>
          <span key={basket.total_eur} className="em-fade" style={{ fontSize: 32, fontWeight: 800, color: TEXT, fontVariantNumeric: "tabular-nums" }}>
            {formatPrice(basket.total_eur, language)}
          </span>
        </div>
      )}
    </section>
  );
}
