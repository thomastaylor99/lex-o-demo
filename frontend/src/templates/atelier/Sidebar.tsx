import { formatPrice, profileChips } from "@/components/i18n";
import type { Basket, BeautyProfile, Language } from "@/lib/events";

import { GREY, INK, LIGHT, SANS, SERIF, WELL } from "./styles";

/** The right quarter: what the visitor chose, and what the brand learned with consent. */
export function Sidebar({
  basket,
  profile,
  language,
}: {
  basket: Basket;
  profile: BeautyProfile | null;
  language: Language;
}) {
  const chips = profile ? profileChips(profile, language).filter((chip) => chip !== profile.first_name) : [];
  const consent = profile?.consent ?? "pending";

  return (
    <aside style={{ borderLeft: `1px solid ${INK}`, padding: "36px 40px", display: "flex", flexDirection: "column", gap: 40, minHeight: 0, overflowY: "auto" }}>
      <section>
        <h3 style={{ fontFamily: SERIF, fontSize: 30, color: INK, marginBottom: 18 }}>Selection</h3>
        {basket.items.length === 0 ? (
          <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 18, color: GREY }}>Nothing chosen yet.</p>
        ) : (
          <ul style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {basket.items.map((item) => (
              <li key={item.product_id} className="at-pop" style={{ display: "grid", gridTemplateColumns: "56px 1fr auto", gap: 14, alignItems: "center" }}>
                <span style={{ position: "relative", width: 56, height: 56, background: WELL }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/products/${item.product_id}.png`} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", padding: 6, mixBlendMode: "multiply" }} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontFamily: SANS, fontSize: 12, color: GREY }}>{item.brand}</span>
                  <span style={{ display: "block", fontFamily: SERIF, fontSize: 18, color: INK, lineHeight: 1.2 }}>{item.name}</span>
                </span>
                <span style={{ fontFamily: SANS, fontSize: 16, fontVariantNumeric: "tabular-nums" }}>{formatPrice(item.price_eur, language)}</span>
              </li>
            ))}
          </ul>
        )}
        {basket.items.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderTop: `1px solid ${INK}`, marginTop: 18, paddingTop: 12 }}>
            <span style={{ fontFamily: SANS, fontSize: 15, color: GREY }}>Total</span>
            <span style={{ fontFamily: SERIF, fontSize: 32, fontVariantNumeric: "tabular-nums" }}>{formatPrice(basket.total_eur, language)}</span>
          </div>
        )}
      </section>

      <section>
        <h3 style={{ fontFamily: SERIF, fontSize: 30, color: INK, marginBottom: 6 }}>Client</h3>
        <p className={profile?.first_name ? "at-fade" : ""} style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 20, color: profile?.first_name ? INK : GREY, marginBottom: 16 }}>
          {profile?.first_name ?? "Profile builds as they speak"}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {chips.map((chip) => (
            <span key={chip} className="at-pop" style={{ fontFamily: SANS, fontSize: 15, border: `1px solid ${INK}`, borderRadius: 999, padding: "6px 14px" }}>
              {chip}
            </span>
          ))}
        </div>
        {consent !== "pending" && (
          <p className="at-fade" style={{ marginTop: 20, fontFamily: SANS, fontSize: 15, padding: "8px 14px", display: "inline-block", background: consent === "given" ? INK : "transparent", color: consent === "given" ? "#fff" : GREY, border: `1px solid ${consent === "given" ? INK : LIGHT}` }}>
            {consent === "given" ? "Saved with consent" : "Not saved"}
          </p>
        )}
      </section>
    </aside>
  );
}
