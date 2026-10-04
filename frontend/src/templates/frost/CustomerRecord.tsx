import { profileWord } from "@/components/i18n";
import type { BeautyProfile, Consent, Language } from "@/lib/events";

import { CheckIcon, LockIcon } from "./icons";
import { RecordRow } from "./RecordRow";
import { BUBBLE, CARD_SHADOW, INK, MUTED, YELLOW } from "./theme";

const LANGUAGES: Record<Language, string> = { en: "English", fr: "French" };

/** The record fields in the order a beauty adviser would read them, null until captured. */
function fields(profile: BeautyProfile | null, language: Language): { label: string; value: string | null }[] {
  const word = (key: string | null | undefined) => profileWord(key, language);
  const list = (keys: (string | null | undefined)[]) => keys.map(word).filter(Boolean).join(", ") || null;
  const p = profile;
  return [
    { label: "First name", value: p?.first_name ?? null },
    { label: "Language", value: p?.language ? LANGUAGES[p.language] : null },
    { label: "Skin type", value: word(p?.skin_type) },
    { label: "Concerns", value: list(p?.concerns ?? []) },
    { label: "Sensitivity", value: p?.sensitive == null ? null : p.sensitive ? word("sensitive") : "Not reactive" },
    { label: "Texture", value: word(p?.texture_preference) },
    { label: "Budget", value: word(p?.budget_band) },
    { label: "Routine size", value: word(p?.routine_size) },
    { label: "Hair", value: list([p?.hair_type, ...(p?.hair_concerns ?? [])]) },
  ];
}

function ConsentState({ consent }: { consent: Consent }) {
  const pill = { display: "flex", alignItems: "center", gap: 12, marginTop: 16, borderRadius: 999, padding: "11px 18px 11px 12px" } as const;
  if (consent === "given") {
    return (
      <div className="fr-pop" style={{ ...pill, background: INK, color: "#fff", fontSize: 17, fontWeight: 600 }}>
        <span style={{ width: 28, height: 28, display: "grid", placeItems: "center", borderRadius: 999, background: YELLOW, color: INK }}>
          <CheckIcon />
        </span>
        Saved with consent
      </div>
    );
  }
  return (
    <div key={consent} className="fr-in" style={{ ...pill, background: BUBBLE, color: MUTED, fontSize: 16, fontWeight: 500 }}>
      <span style={{ width: 28, height: 28, display: "grid", placeItems: "center", borderRadius: 999, background: "#fff", color: INK }}>
        <LockIcon size={15} />
      </span>
      {consent === "declined" ? "Not saved" : "Consent asked before saving"}
    </div>
  );
}

/** The zero-party data this conversation collects, as the record L'Oréal would store. */
export function CustomerRecord({ profile, language }: { profile: BeautyProfile | null; language: Language }) {
  const rows = fields(profile, language);
  const captured = rows.filter((row) => row.value !== null).length;

  return (
    <section style={{ borderRadius: 24, padding: 24, background: "#fff", boxShadow: CARD_SHADOW }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.015em", color: INK }}>Customer record</h2>
          <p style={{ fontSize: 15, color: MUTED, marginTop: 3 }}>What L&rsquo;Oréal would store</p>
        </div>
        <span
          key={captured}
          className="fr-pop"
          style={{ borderRadius: 999, padding: "6px 13px", background: INK, color: "#fff", fontSize: 15, fontWeight: 600, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}
        >
          {captured} of {rows.length}
        </span>
      </div>
      {rows.map((row) => (
        <RecordRow key={row.label} label={row.label} value={row.value} />
      ))}
      <ConsentState consent={profile?.consent ?? "pending"} />
    </section>
  );
}
