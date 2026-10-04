import { profileWord } from "@/components/i18n";
import type { BeautyProfile, Consent, Language } from "@/lib/events";

import { CheckIcon } from "./icons";
import { RecordRow } from "./RecordRow";
import { AMBER, darkCard, DARK_BORDER, ON_DARK, ON_DARK_MUTED, TEXT } from "./styles";

const LANGUAGE_NAMES: Record<Language, string> = { en: "English", fr: "French" };

const CONSENT: Record<Consent, string> = {
  pending: "Consent asked before saving",
  given: "Saved with consent",
  declined: "Not saved",
};

const list = (values: (string | null)[]) => values.filter(Boolean).join(", ") || null;

function ConsentPill({ consent }: { consent: Consent }) {
  const given = consent === "given";
  return (
    <span
      key={consent}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 9,
        borderRadius: 999,
        padding: "9px 16px",
        fontSize: 15,
        fontWeight: 700,
        background: given ? AMBER : "transparent",
        color: given ? TEXT : ON_DARK_MUTED,
        boxShadow: given ? "0 0 24px rgba(255, 154, 60, 0.35)" : `inset 0 0 0 1px ${DARK_BORDER}`,
        animation: consent === "pending" ? undefined : "du-pill 600ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
      }}
    >
      {given ? <CheckIcon size={16} /> : <span style={{ width: 8, height: 8, borderRadius: 999, boxShadow: `inset 0 0 0 1.5px ${ON_DARK_MUTED}` }} />}
      {CONSENT[consent]}
    </span>
  );
}

/** The record L'Oréal would store: the zero-party data the visitor shares, field by field. */
export function CustomerRecord({ profile, language }: { profile: BeautyProfile | null; language: Language }) {
  const word = (key: string | null | undefined) => profileWord(key, language);
  const sensitive = profile?.sensitive;
  const rows: [string, string | null][] = [
    ["First name", profile?.first_name ?? null],
    ["Language", profile?.language ? LANGUAGE_NAMES[profile.language] : null],
    ["Skin type", word(profile?.skin_type)],
    ["Concerns", list((profile?.concerns ?? []).map(word))],
    ["Sensitivity", sensitive === true ? word("sensitive") : sensitive === false ? "Not reactive" : null],
    ["Texture", word(profile?.texture_preference)],
    ["Budget", word(profile?.budget_band)],
    ["Routine size", word(profile?.routine_size)],
    ["Hair", list([word(profile?.hair_type), ...(profile?.hair_concerns ?? []).map(word)])],
  ];
  const captured = rows.filter(([, value]) => value !== null).length;

  return (
    <section style={darkCard}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: ON_DARK }}>Customer record</h3>
        <span style={{ fontSize: 15, fontWeight: 700, color: captured ? AMBER : ON_DARK_MUTED, fontVariantNumeric: "tabular-nums" }}>
          {captured} of {rows.length}
        </span>
      </div>
      <p style={{ fontSize: 14, color: ON_DARK_MUTED, marginTop: 2, marginBottom: 8 }}>Zero-party data, shared in conversation</p>

      {rows.map(([label, value]) => (
        <RecordRow key={label} label={label} value={value} />
      ))}

      <div style={{ marginTop: 14 }}>
        <ConsentPill consent={profile?.consent ?? "pending"} />
      </div>
    </section>
  );
}
