import { formatPrice, profileChips } from "@/components/i18n";
import type { Basket, BeautyProfile, Language } from "@/lib/events";

import { DISPLAY, MONO, NARROW, YELLOW } from "./styles";

const DIM = "#8C8C8C";
const LINE = "#2E2E2E";

/** The inverted quarter: a black panel with the basket and the client card. */
export function Sidebar({ basket, profile, language }: { basket: Basket; profile: BeautyProfile | null; language: Language }) {
  const chips = profile ? profileChips(profile, language).filter((chip) => chip !== profile.first_name) : [];
  const consent = profile?.consent ?? "pending";

  return (
    <aside className="cp-scroll" style={{ background: "#000", color: "#fff", padding: "34px 30px", display: "flex", flexDirection: "column", gap: 44, overflowY: "auto" }}>
      <section>
        <h3 style={{ fontFamily: MONO, fontSize: 13, color: DIM, marginBottom: 16 }}>Basket, {basket.items.length} items</h3>
        {basket.items.length === 0 && <p style={{ fontFamily: MONO, fontSize: 14, color: "#5C5C5C" }}>Empty until the visitor chooses.</p>}
        {basket.items.map((item) => (
          <div key={item.product_id} className="cp-rise" style={{ display: "grid", gridTemplateColumns: "60px 1fr auto", gap: 14, alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${LINE}` }}>
            <span style={{ position: "relative", width: 60, height: 60, background: "#fff" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/products/${item.product_id}.png`} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", padding: 6 }} />
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontFamily: MONO, fontSize: 12, color: DIM }}>{item.brand}</span>
              <span style={{ display: "block", fontFamily: DISPLAY, fontVariationSettings: NARROW, fontWeight: 600, fontSize: 18, lineHeight: 1.2 }}>{item.name}</span>
            </span>
            <span style={{ fontFamily: MONO, fontSize: 15 }}>{formatPrice(item.price_eur, language)}</span>
          </div>
        ))}
        {basket.items.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 16 }}>
            <span style={{ fontFamily: MONO, fontSize: 14, color: DIM }}>Total</span>
            <span key={basket.total_eur} className="cp-fade" style={{ fontFamily: DISPLAY, fontVariationSettings: NARROW, fontWeight: 600, fontSize: 44 }}>
              {formatPrice(basket.total_eur, language)}
            </span>
          </div>
        )}
      </section>

      <section>
        <h3 style={{ fontFamily: MONO, fontSize: 13, color: DIM, marginBottom: 12 }}>Client</h3>
        <p key={profile?.first_name ?? "anon"} className="cp-fade" style={{ fontFamily: DISPLAY, fontVariationSettings: NARROW, fontWeight: 600, fontSize: 44, lineHeight: 1.05, color: profile?.first_name ? "#fff" : "#4A4A4A" }}>
          {profile?.first_name ?? "Not introduced"}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18 }}>
          {chips.length === 0 && <span style={{ fontFamily: MONO, fontSize: 14, color: "#5C5C5C" }}>The profile fills in as they talk.</span>}
          {chips.map((chip) => (
            <span key={chip} className="cp-fade" style={{ fontFamily: MONO, fontSize: 13, border: "1px solid #fff", padding: "5px 10px" }}>
              {chip}
            </span>
          ))}
        </div>
        <p style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 24, fontFamily: MONO, fontSize: 14, color: consent === "given" ? "#fff" : DIM }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: consent === "given" ? YELLOW : LINE }} />
          {consent === "given" ? "Saved with consent" : consent === "declined" ? "Not saved, visitor declined" : "Consent asked at the end"}
        </p>
      </section>
    </aside>
  );
}
