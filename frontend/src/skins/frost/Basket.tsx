import { formatPrice, labels } from "@/components/i18n";

import type { SkinProps } from "../types";
import { Packshot } from "./Packshot";
import { CARD_SHADOW, CLAMP_2, fs, INK, MUTED, ON_DARK_MUTED, QUIET, SURFACE } from "./theme";

/** What the visitor chose: thumbnails, names, prices, and the total in a black pill. */
export function Basket({ agent }: SkinProps) {
  const { basket, language } = agent;
  const l = labels(language);
  const count = basket.items.length;

  return (
    <section className="fr-in" style={{ borderRadius: 22, padding: 20, background: "#fff", boxShadow: CARD_SHADOW }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: count ? 8 : 6 }}>
        <h2 style={{ fontSize: fs(22), fontWeight: 600, letterSpacing: "-0.015em", color: INK }}>{l.yourSelection}</h2>
        {count > 0 && (
          <span
            key={count}
            className="fr-pop"
            style={{ minWidth: 26, height: 26, display: "grid", placeItems: "center", borderRadius: 999, padding: "0 9px", background: INK, color: "#fff", fontSize: fs(15), fontWeight: 600 }}
          >
            {count}
          </span>
        )}
      </div>

      {count === 0 && <p style={{ fontSize: fs(16), lineHeight: 1.45, color: QUIET }}>{l.basketEmpty}</p>}

      {basket.items.map((item) => (
        <div
          key={item.product_id}
          className="fr-in"
          style={{ display: "grid", gridTemplateColumns: "54px minmax(0, 1fr) auto", alignItems: "center", gap: 12, padding: "7px 0" }}
        >
          <span style={{ position: "relative", width: 54, height: 54, borderRadius: 14, background: SURFACE, overflow: "hidden" }}>
            {/* Multiply melts the packshot's white background into the grey well. */}
            <span style={{ position: "absolute", inset: 0, mixBlendMode: "multiply" }}>
              <Packshot id={item.product_id} brand={item.brand} padding={6} initialSize={fs(26)} />
            </span>
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontSize: fs(14), color: MUTED }}>{item.brand}</span>
            <span style={{ ...CLAMP_2, fontSize: fs(17), fontWeight: 600, lineHeight: 1.25, color: INK }}>{item.name}</span>
          </span>
          <span style={{ fontSize: fs(17), fontWeight: 600, color: INK, fontVariantNumeric: "tabular-nums" }}>{formatPrice(item.price_eur, language)}</span>
        </div>
      ))}

      {count > 0 && (
        <div
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, borderRadius: 999, padding: "10px 18px", background: INK, color: "#fff" }}
        >
          <span style={{ fontSize: fs(16), color: ON_DARK_MUTED }}>{l.total}</span>
          <span key={basket.total_eur} className="fr-pop" style={{ fontSize: fs(26), fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {formatPrice(basket.total_eur, language)}
          </span>
        </div>
      )}
    </section>
  );
}
