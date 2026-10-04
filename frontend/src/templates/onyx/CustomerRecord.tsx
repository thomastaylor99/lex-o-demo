import { profileWord } from "@/components/i18n";
import type { BeautyProfile, Consent, Language } from "@/lib/events";

import { RecordRow } from "./RecordRow";
import { BUBBLE, CARD, WHITE, WHITE_38, WHITE_64, YELLOW } from "./styles";

const LANGUAGE_NAMES: Record<Language, string> = { en: "English", fr: "French" };

const CONSENT: Record<Consent, string> = {
  pending: "Consent asked before saving",
  given: "Saved with consent",
  declined: "Not saved",
};

/** The record fields in the order L'Oréal would read them, each with its value once captured. */
function fields(profile: BeautyProfile | null, language: Language): [string, string | null][] {
  const word = (key: string | null | undefined) => profileWord(key, language);
  const list = (keys: (string | null | undefined)[]) => keys.map(word).filter(Boolean).join(", ") || null;
  const sensitive = profile?.sensitive;
  return [
    ["First name", profile?.first_name ?? null],
    ["Language", profile?.language ? LANGUAGE_NAMES[profile.language] : null],
    ["Skin type", word(profile?.skin_type)],
    ["Concerns", list(profile?.concerns ?? [])],
    ["Sensitivity", sensitive === true ? word("sensitive") : sensitive === false ? "Not reactive" : null],
    ["Texture", word(profile?.texture_preference)],
    ["Budget", word(profile?.budget_band)],
    ["Routine size", word(profile?.routine_size)],
    ["Hair", list([profile?.hair_type, ...(profile?.hair_concerns ?? [])])],
  ];
}

function ConsentBadge({ consent }: { consent: Consent }) {
  const given = consent === "given";
  return (
    <div
      className={consent === "pending" ? undefined : "ox-chip"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginTop: 16,
        borderRadius: 18,
        padding: "14px 18px",
        background: given ? YELLOW : BUBBLE,
        color: given ? "#0B0B0C" : consent === "declined" ? WHITE_38 : WHITE_64,
        fontSize: 18,
        fontWeight: 600,
      }}
    >
      {given ? (
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
          <path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <span aria-hidden style={{ width: 14, height: 14, flex: "none", borderRadius: 999, boxShadow: "inset 0 0 0 2px currentColor" }} />
      )}
      {CONSENT[consent]}
    </div>
  );
}

/** What L'Oréal would store from this conversation: zero-party data, one row per field, saved only with consent. */
export function CustomerRecord({ profile, language }: { profile: BeautyProfile | null; language: Language }) {
  const rows = fields(profile, language);
  const captured = rows.filter(([, value]) => value !== null).length;

  return (
    <section style={{ background: CARD, borderRadius: 26, padding: 22 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h3 style={{ fontSize: 24, fontWeight: 700, color: WHITE }}>Customer record</h3>
        <span style={{ background: BUBBLE, color: captured > 0 ? YELLOW : WHITE_38, borderRadius: 999, padding: "4px 12px", fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
          {captured} of {rows.length}
        </span>
      </div>
      <p style={{ fontSize: 15, color: WHITE_38, margin: "6px 0 10px" }}>Zero-party data, shared by voice</p>
      {rows.map(([label, value]) => (
        <RecordRow key={`${label}:${value ?? ""}`} label={label} value={value} />
      ))}
      <ConsentBadge key={profile?.consent ?? "pending"} consent={profile?.consent ?? "pending"} />
    </section>
  );
}
