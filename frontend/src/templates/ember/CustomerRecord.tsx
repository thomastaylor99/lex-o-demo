import { profileWord } from "@/components/i18n";
import type { BeautyProfile, Consent, Language } from "@/lib/events";

import { AMBER, AMBER_SOFT, FAINT, MUTED, TEXT, glass } from "./theme";

const LANGUAGES: Record<Language, string> = { en: "English", fr: "French" };

/** The record L'Oréal would store, one row per field, in reading order. */
function fields(profile: BeautyProfile | null, language: Language): [string, string | null][] {
  const word = (key: string | null | undefined) => profileWord(key, language);
  const list = (keys: (string | null | undefined)[]) => keys.map(word).filter(Boolean).join(", ") || null;
  const sensitive = profile?.sensitive;
  return [
    ["First name", profile?.first_name ?? null],
    ["Language", profile?.language ? LANGUAGES[profile.language] : null],
    ["Skin type", word(profile?.skin_type)],
    ["Concerns", list(profile?.concerns ?? [])],
    ["Sensitivity", sensitive === true ? word("sensitive") : sensitive === false ? "Not reactive" : null],
    ["Texture", word(profile?.texture_preference)],
    ["Budget", word(profile?.budget_band)],
    ["Routine size", word(profile?.routine_size)],
    ["Hair", list([profile?.hair_type, ...(profile?.hair_concerns ?? [])])],
  ];
}

const CONSENT: Record<Consent, { text: string; icon: string }> = {
  pending: { text: "Consent asked before saving", icon: "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z" },
  given: { text: "Saved with consent", icon: "M5 12.5l4.5 4.5L19 7.5" },
  declined: { text: "Not saved", icon: "M6 12h12" },
};

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div
      className={value ? "em-lit" : undefined}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 14px", borderRadius: 16, background: value ? "rgba(255, 255, 255, 0.035)" : "transparent" }}
    >
      <span
        style={{ flex: "none", width: 10, height: 10, borderRadius: 999, background: value ? AMBER : "transparent", border: value ? "none" : "2px solid rgba(255, 255, 255, 0.2)" }}
      />
      <span style={{ flex: "0 0 112px", fontSize: 16, color: MUTED }}>{label}</span>
      <span
        className={value ? "em-value" : undefined}
        style={{ flex: 1, minWidth: 0, textAlign: "right", fontSize: value ? 17 : 15, fontWeight: value ? 600 : 400, color: value ? TEXT : FAINT }}
      >
        {value ?? "Not captured yet"}
      </span>
    </div>
  );
}

/** The zero-party data the conversation collects, as the customer record L'Oréal would keep. */
export function CustomerRecord({ profile, language }: { profile: BeautyProfile | null; language: Language }) {
  const rows = fields(profile, language);
  const captured = rows.filter(([, value]) => value !== null).length;
  const consent = profile?.consent ?? "pending";
  const given = consent === "given";

  return (
    <section style={{ ...glass(28), padding: "22px 18px 18px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, margin: "0 6px 12px" }}>
        <div>
          <h3 style={{ fontSize: 24, fontWeight: 700, color: TEXT }}>Customer record</h3>
          <p style={{ fontSize: 15, color: FAINT, marginTop: 4 }}>Zero-party data, shared by the visitor</p>
        </div>
        <span
          style={{ flex: "none", padding: "6px 14px", borderRadius: 999, fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums", background: captured ? AMBER_SOFT : "rgba(255, 255, 255, 0.06)", color: captured ? AMBER : FAINT }}
        >
          {captured} of {rows.length}
        </span>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {rows.map(([label, value]) => (
          <Row key={`${label}-${value ?? ""}`} label={label} value={value} />
        ))}
      </div>

      <div
        key={consent}
        className={consent === "pending" ? undefined : "em-rise"}
        style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, padding: "14px 16px", borderRadius: 18, background: given ? AMBER_SOFT : "rgba(255, 255, 255, 0.05)", color: given ? AMBER : MUTED }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d={CONSENT[consent].icon} />
        </svg>
        <span style={{ fontSize: 17, fontWeight: 600 }}>{CONSENT[consent].text}</span>
      </div>
    </section>
  );
}
