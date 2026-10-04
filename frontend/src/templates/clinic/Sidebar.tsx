import { formatPrice } from "@/components/i18n";
import type { Basket, BeautyProfile, Language } from "@/lib/events";

import { BLUE, BLUE_TINT, BODY, CARD_SHADOW, DISPLAY, FAINT, LINE, MUTED, SURFACE, TEXT } from "./styles";

const WORDS: Record<string, string> = {
  dry: "Dry", normal: "Normal", combination: "Combination", oily: "Oily",
  hydration: "Hydration", sensitivity: "Sensitivity", first_signs_of_ageing: "First signs of ageing",
  firmness_wrinkles: "Firmness", radiance: "Radiance", blemish_prone: "Blemish-prone",
  dry_hair: "Dry hair", frizz: "Frizz", damaged_hair: "Damaged hair",
  rich: "Rich textures", light: "Light textures",
  under_20: "Under €20", "20_to_40": "€20 to €40", "40_to_80": "€40 to €80", over_80: "Over €80",
  minimal: "Short", standard: "Standard", full: "Full",
  straight: "Straight", wavy: "Wavy", curly: "Curly", coily: "Coily",
};

const word = (value: string | null | undefined) => (value ? (WORDS[value] ?? value) : null);

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: `1px solid ${LINE}` }}>
      <span style={{ color: MUTED, fontSize: 15 }}>{label}</span>
      <span key={value ?? "none"} className={value ? "cl-fade" : ""} style={{ color: value ? TEXT : FAINT, fontSize: 15, fontWeight: value ? 600 : 400, textAlign: "right" }}>
        {value ?? "Not yet"}
      </span>
    </div>
  );
}

/** The right quarter: the routine the visitor builds, and their skin profile as a clinical record. */
export function Sidebar({ basket, profile, language }: { basket: Basket; profile: BeautyProfile | null; language: Language }) {
  const concerns = [...(profile?.concerns ?? [])].map(word).filter(Boolean).join(", ") || null;
  const hair = [word(profile?.hair_type), ...(profile?.hair_concerns ?? []).map(word)].filter(Boolean).join(", ") || null;
  const sensitivity = profile?.sensitive === true ? "Reactive" : profile?.sensitive === false ? "Not reactive" : null;
  const consent = profile?.consent ?? "pending";
  const card = { background: "#fff", borderRadius: 22, boxShadow: CARD_SHADOW, padding: 22 } as const;

  return (
    <aside className="cl-scroll" style={{ background: SURFACE, padding: "28px 28px", display: "flex", flexDirection: "column", gap: 20, overflowY: "auto", fontFamily: BODY }}>
      <section style={card}>
        <h3 style={{ fontFamily: DISPLAY, fontSize: 26, color: TEXT, marginBottom: 12 }}>Your routine</h3>
        {basket.items.length === 0 && <p style={{ color: FAINT, fontSize: 15 }}>Products the visitor chooses appear here.</p>}
        {basket.items.map((item) => (
          <div key={item.product_id} className="cl-pop" style={{ display: "grid", gridTemplateColumns: "52px 1fr auto", gap: 12, alignItems: "center", padding: "8px 0" }}>
            <span style={{ position: "relative", width: 52, height: 52, borderRadius: 14, background: SURFACE }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/products/${item.product_id}.png`} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", padding: 6, mixBlendMode: "multiply" }} />
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 12, color: MUTED }}>{item.brand}</span>
              <span style={{ display: "block", fontSize: 15, fontWeight: 600, color: TEXT, lineHeight: 1.25 }}>{item.name}</span>
            </span>
            <span style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{formatPrice(item.price_eur, language)}</span>
          </div>
        ))}
        {basket.items.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderTop: `1px solid ${LINE}`, marginTop: 10, paddingTop: 12 }}>
            <span style={{ color: MUTED }}>Total</span>
            <span style={{ fontSize: 26, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{formatPrice(basket.total_eur, language)}</span>
          </div>
        )}
      </section>

      <section style={card}>
        <h3 style={{ fontFamily: DISPLAY, fontSize: 26, color: TEXT, marginBottom: 6 }}>Skin profile</h3>
        <Row label="Name" value={profile?.first_name ?? null} />
        <Row label="Skin type" value={word(profile?.skin_type)} />
        <Row label="Concerns" value={concerns} />
        <Row label="Sensitivity" value={sensitivity} />
        <Row label="Texture" value={word(profile?.texture_preference)} />
        <Row label="Budget" value={word(profile?.budget_band)} />
        <Row label="Hair" value={hair} />
        <div style={{ marginTop: 16 }}>
          <span className={consent === "pending" ? "" : "cl-fade"} style={{ display: "inline-block", borderRadius: 999, padding: "6px 14px", fontSize: 14, fontWeight: 600, background: consent === "given" ? BLUE : BLUE_TINT, color: consent === "given" ? "#fff" : consent === "declined" ? MUTED : BLUE }}>
            {consent === "given" ? "Saved with consent" : consent === "declined" ? "Not saved" : "Consent asked at the end"}
          </span>
        </div>
      </section>
    </aside>
  );
}
