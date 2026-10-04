import { formatPrice } from "@/components/i18n";
import type { Basket as BasketState, Language } from "@/lib/events";

import { AMBER_TINT, DISPLAY, LINE, MUTED, PANEL_CARD, SURFACE, TEXT, productImage } from "./theme";

const CLAMP = { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as const;

/** What the visitor has chosen: thumbnails, names, prices and the running total. */
export function Basket({ basket, language }: { basket: BasketState; language: Language }) {
  const count = basket.items.length;
  return (
    <section style={PANEL_CARD}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
        <h3 style={{ fontFamily: DISPLAY, fontSize: 30, lineHeight: 1.1, color: TEXT }}>Your selection</h3>
        {count > 0 && (
          <span key={count} className="lm-pop" style={{ background: AMBER_TINT, color: TEXT, borderRadius: 999, padding: "5px 12px", fontSize: 14, fontWeight: 700 }}>
            {count === 1 ? "1 item" : `${count} items`}
          </span>
        )}
      </div>

      {count === 0 && <p style={{ fontSize: 16, lineHeight: 1.45, color: MUTED, padding: "6px 0 2px" }}>Products you choose appear here.</p>}

      {basket.items.map((item) => (
        <div
          key={item.product_id}
          className="lm-pop"
          style={{ display: "grid", gridTemplateColumns: "60px 1fr auto", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: `1px solid ${LINE}` }}
        >
          <span style={{ position: "relative", width: 60, height: 60, borderRadius: 16, background: SURFACE, overflow: "hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={productImage(item.product_id)}
              alt=""
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", padding: 7, mixBlendMode: "multiply" }}
            />
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 14, color: MUTED }}>{item.brand}</span>
            <span style={{ ...CLAMP, fontSize: 17, fontWeight: 600, lineHeight: 1.25, color: TEXT }}>{item.name}</span>
          </span>
          <span style={{ fontSize: 17, fontWeight: 600, color: TEXT, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
            {formatPrice(item.price_eur, language)}
          </span>
        </div>
      ))}

      {count > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 14 }}>
          <span style={{ fontSize: 17, color: MUTED }}>Total</span>
          <span key={basket.total_eur} className="lm-fade" style={{ fontSize: 30, fontWeight: 700, color: TEXT, fontVariantNumeric: "tabular-nums" }}>
            {formatPrice(basket.total_eur, language)}
          </span>
        </div>
      )}
    </section>
  );
}
