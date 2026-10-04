import { formatPrice, profileChips } from "@/components/i18n";
import type { Basket, BeautyProfile, Language } from "@/lib/events";

import { BODY, CHAMPAGNE, CHAMPAGNE_LINE, DISPLAY, FAINT, HAIRLINE, IVORY, MUTED } from "./styles";

/** The right quarter: the basket as a boutique receipt, then the client card. */
export function Sidebar({ basket, profile, language }: { basket: Basket; profile: BeautyProfile | null; language: Language }) {
  const chips = profile ? profileChips(profile, language).filter((chip) => chip !== profile.first_name) : [];
  const consent = profile?.consent ?? "pending";

  return (
    <aside className="nr-scroll" style={{ background: "rgba(10, 10, 11, 0.6)", borderLeft: `1px solid ${HAIRLINE}`, padding: "34px 32px", display: "flex", flexDirection: "column", gap: 34, overflowY: "auto", fontFamily: BODY }}>
      <section>
        <h3 style={{ fontFamily: DISPLAY, fontSize: 30, color: IVORY }}>Your selection</h3>
        <div style={{ marginTop: 18, borderTop: `1px dashed ${CHAMPAGNE_LINE}` }}>
          {basket.items.length === 0 && <p style={{ fontSize: 15, color: FAINT, padding: "16px 0" }}>Nothing chosen yet.</p>}
          {basket.items.map((item) => (
            <div key={item.product_id} className="nr-pop" style={{ display: "grid", gridTemplateColumns: "48px 1fr auto", gap: 14, alignItems: "center", padding: "14px 0", borderBottom: `1px dashed ${CHAMPAGNE_LINE}` }}>
              <span style={{ position: "relative", width: 48, height: 48, background: IVORY, borderRadius: 2 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/products/${item.product_id}.png`} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", padding: 5, mixBlendMode: "multiply" }} />
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 12, letterSpacing: "0.06em", color: CHAMPAGNE }}>{item.brand}</span>
                <span style={{ display: "block", fontSize: 15, color: IVORY, lineHeight: 1.3 }}>{item.name}</span>
              </span>
              <span style={{ fontSize: 15, color: IVORY, fontVariantNumeric: "tabular-nums" }}>{formatPrice(item.price_eur, language)}</span>
            </div>
          ))}
        </div>
        {basket.items.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 16 }}>
            <span style={{ fontSize: 14, letterSpacing: "0.06em", color: MUTED }}>Total</span>
            <span key={basket.total_eur} className="nr-fade" style={{ fontFamily: DISPLAY, fontSize: 42, color: CHAMPAGNE }}>
              {formatPrice(basket.total_eur, language)}
            </span>
          </div>
        )}
      </section>

      <section style={{ border: `1px solid ${CHAMPAGNE_LINE}`, borderRadius: 4, padding: 24, background: "rgba(201, 169, 110, 0.04)" }}>
        <p style={{ fontSize: 13, letterSpacing: "0.08em", color: CHAMPAGNE }}>Client</p>
        <p key={profile?.first_name ?? "anon"} className="nr-fade" style={{ fontFamily: DISPLAY, fontSize: 42, lineHeight: 1.1, marginTop: 6, color: profile?.first_name ? IVORY : FAINT }}>
          {profile?.first_name ?? "Guest"}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
          {chips.length === 0 && <span style={{ fontSize: 14, color: FAINT }}>Their profile appears as they speak.</span>}
          {chips.map((chip) => (
            <span key={chip} className="nr-fade" style={{ fontSize: 13, color: IVORY, border: `1px solid ${CHAMPAGNE_LINE}`, borderRadius: 999, padding: "5px 12px" }}>
              {chip}
            </span>
          ))}
        </div>
        <p style={{ marginTop: 20, paddingTop: 14, borderTop: `1px solid ${HAIRLINE}`, fontSize: 14, color: consent === "given" ? CHAMPAGNE : FAINT }}>
          {consent === "given" ? "Profile saved with consent" : consent === "declined" ? "Not saved, at their request" : "Consent asked before saving"}
        </p>
      </section>
    </aside>
  );
}
