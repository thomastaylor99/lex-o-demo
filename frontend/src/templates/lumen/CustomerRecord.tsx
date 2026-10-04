import { profileWord } from "@/components/i18n";
import type { BeautyProfile, Consent, Language } from "@/lib/events";

import { AMBER, DISPLAY, FAINT, LINE, MUTED, PANEL_CARD, SURFACE, TEXT } from "./theme";

const LANGUAGES: Record<Language, string> = { en: "English", fr: "French" };

const CONSENT: Record<Consent, { text: string; path: string }> = {
  pending: { text: "Consent asked before saving", path: "M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z" },
  given: { text: "Saved with consent", path: "M5 12.5l4.5 4.5L19 7.5" },
  declined: { text: "Not saved", path: "M7 7l10 10M17 7L7 17" },
};

/** The record L'Oréal would store, one field per row, in the order an adviser reads it. */
function fields(profile: BeautyProfile | null, language: Language): { label: string; value: string | null }[] {
  const word = (key: string | null | undefined) => profileWord(key, language);
  const list = (keys: (string | null)[]) => keys.map(word).filter((value): value is string => !!value).join(", ") || null;
  const sensitive = profile?.sensitive;
  return [
    { label: "First name", value: profile?.first_name ?? null },
    { label: "Language", value: profile?.language ? LANGUAGES[profile.language] : null },
    { label: "Skin type", value: word(profile?.skin_type) },
    { label: "Concerns", value: list(profile?.concerns ?? []) },
    { label: "Sensitivity", value: sensitive === true ? word("sensitive") : sensitive === false ? "Not reactive" : null },
    { label: "Texture", value: word(profile?.texture_preference) },
    { label: "Budget", value: word(profile?.budget_band) },
    { label: "Routine size", value: word(profile?.routine_size) },
    { label: "Hair", value: list([profile?.hair_type ?? null, ...(profile?.hair_concerns ?? [])]) },
  ];
}

/** One field. Keyed by its value, so the row lights up amber each time it gets filled. */
function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={{ borderBottom: `1px solid ${LINE}` }}>
      <div
        key={value ?? "empty"}
        className={value ? "lm-flash" : undefined}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, margin: "2px -10px", padding: "8px 10px", borderRadius: 12 }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, color: MUTED, whiteSpace: "nowrap" }}>
          <span className={value ? "lm-pop" : undefined} style={{ width: 9, height: 9, flex: "none", borderRadius: 999, background: value ? AMBER : LINE }} />
          {label}
        </span>
        <span style={{ fontSize: 17, lineHeight: 1.3, fontWeight: value ? 600 : 400, color: value ? TEXT : FAINT, textAlign: "right" }}>
          {value ?? "Not captured yet"}
        </span>
      </div>
    </div>
  );
}

/** The zero-party data the conversation collects, and whether the visitor agreed to keep it. */
export function CustomerRecord({ profile, language }: { profile: BeautyProfile | null; language: Language }) {
  const rows = fields(profile, language);
  const captured = rows.filter((row) => row.value !== null).length;
  const consent = profile?.consent ?? "pending";
  const given = consent === "given";

  return (
    <section style={PANEL_CARD}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <h3 style={{ fontFamily: DISPLAY, fontSize: 30, lineHeight: 1.1, color: TEXT }}>Customer record</h3>
        <span style={{ fontSize: 15, fontWeight: 600, color: MUTED, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
          {captured} of {rows.length} captured
        </span>
      </div>
      <p style={{ fontSize: 15, color: MUTED, marginTop: 4 }}>Zero-party data from this conversation</p>
      <div style={{ height: 6, borderRadius: 999, background: SURFACE, margin: "12px 0 6px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(captured / rows.length) * 100}%`, borderRadius: 999, background: AMBER, transition: "width 700ms ease" }} />
      </div>

      {rows.map((row) => (
        <Row key={row.label} label={row.label} value={row.value} />
      ))}

      <span
        key={consent}
        className={consent === "pending" ? undefined : "lm-pop"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          marginTop: 16,
          borderRadius: 999,
          padding: "9px 18px 9px 14px",
          fontSize: 16,
          fontWeight: 600,
          background: given ? AMBER : SURFACE,
          color: consent === "declined" ? MUTED : TEXT,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden fill="none" stroke={given ? TEXT : MUTED} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d={CONSENT[consent].path} />
        </svg>
        {CONSENT[consent].text}
      </span>
    </section>
  );
}
