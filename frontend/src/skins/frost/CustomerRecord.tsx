import { labels, profileWord, type Labels } from "@/components/i18n";
import type { BeautyProfile, Consent, Language } from "@/lib/events";

import type { SkinProps } from "../types";
import { CheckIcon, LockIcon } from "./icons";
import { RecordRow } from "./RecordRow";
import { BUBBLE, CARD_SHADOW, fs, INK, MUTED, YELLOW } from "./theme";

interface Field {
  id: string;
  label: string;
  /** The value in words, null until captured. */
  value: string | null;
  /** The value as captured, the same in every language. */
  raw: string | null;
}

/** The nine record fields in the order a beauty adviser would read them. */
function fields(p: BeautyProfile | null, language: Language, l: Labels): Field[] {
  const word = (key: string | null | undefined) => profileWord(key, language);
  const list = (keys: (string | null | undefined)[]) => keys.map(word).filter(Boolean).join(", ") || null;
  const field = (id: string, label: string, captured: unknown, value: string | null): Field => ({
    id,
    label,
    value,
    raw: value === null ? null : JSON.stringify(captured),
  });
  return [
    field("first_name", l.rowFirstName, p?.first_name, p?.first_name || null),
    field("language", l.rowLanguage, p?.language, p?.language ? l.languageName[p.language] : null),
    field("skin_type", l.rowSkinType, p?.skin_type, word(p?.skin_type)),
    field("concerns", l.rowConcerns, p?.concerns, list(p?.concerns ?? [])),
    field("sensitive", l.rowSensitivity, p?.sensitive, p?.sensitive == null ? null : p.sensitive ? word("sensitive") : l.notReactive),
    field("texture", l.rowTexture, p?.texture_preference, word(p?.texture_preference)),
    field("budget", l.rowBudget, p?.budget_band, word(p?.budget_band)),
    field("routine", l.rowRoutine, p?.routine_size, word(p?.routine_size)),
    field("hair", l.rowHair, [p?.hair_type, p?.hair_concerns], list([p?.hair_type, ...(p?.hair_concerns ?? [])])),
  ];
}

function ConsentLine({ consent, l }: { consent: Consent; l: Labels }) {
  const pill = { display: "flex", alignItems: "center", gap: 10, marginTop: 14, borderRadius: 999, padding: "9px 16px 9px 10px" } as const;
  if (consent === "given") {
    return (
      <div className="fr-pop" style={{ ...pill, background: INK, color: "#fff", fontSize: fs(17), fontWeight: 600 }}>
        <span style={{ flex: "0 0 24px", height: 24, display: "grid", placeItems: "center", borderRadius: 999, background: YELLOW, color: INK }}>
          <CheckIcon size={14} />
        </span>
        {l.savedWithConsent}
      </div>
    );
  }
  return (
    <div key={consent} className="fr-in" style={{ ...pill, background: BUBBLE, color: MUTED, fontSize: fs(16), fontWeight: 500 }}>
      <span style={{ flex: "0 0 24px", height: 24, display: "grid", placeItems: "center", borderRadius: 999, background: "#fff", color: INK }}>
        <LockIcon size={13} />
      </span>
      {consent === "declined" ? l.notSaved : l.consentPending}
    </div>
  );
}

/** The zero-party data this conversation collects, as the record L'Oréal would store, and the consent. */
export function CustomerRecord({ agent }: SkinProps) {
  const { profile, language } = agent;
  const l = labels(language);
  const rows = fields(profile, language, l);
  const captured = rows.filter((row) => row.value !== null).length;

  return (
    <section className="fr-in" style={{ animationDelay: "120ms", borderRadius: 22, padding: 20, background: "#fff", boxShadow: CARD_SHADOW }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
        <div>
          <h2 style={{ fontSize: fs(22), fontWeight: 600, letterSpacing: "-0.015em", color: INK }}>{l.customerRecord}</h2>
          <p style={{ marginTop: 2, fontSize: fs(15), color: MUTED }}>{l.recordSubtitle}</p>
        </div>
        <span
          key={captured}
          className="fr-pop"
          style={{ borderRadius: 999, padding: "5px 11px", background: INK, color: "#fff", fontSize: fs(15), fontWeight: 600, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}
        >
          {`${captured} ${l.of} ${rows.length}`}
        </span>
      </div>
      {rows.map((row) => (
        <RecordRow key={row.id} label={row.label} value={row.value} raw={row.raw} empty={l.notCaptured} />
      ))}
      <ConsentLine consent={profile?.consent ?? "pending"} l={l} />
    </section>
  );
}
