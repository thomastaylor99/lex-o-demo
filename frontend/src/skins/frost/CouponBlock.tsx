import { labels } from "@/components/i18n";
import type { Coupon, Language } from "@/lib/events";

import { Qr } from "./Qr";
import { INK, ON_DARK_MUTED, YELLOW, fs } from "./theme";

/** "2026-11-04" as "4 November 2026" or "4 novembre 2026"; anything that is not a date stays as given. */
function formatDate(iso: string, language: Language): string {
  const day = /^\d{4}-\d{2}-\d{2}/.exec(iso)?.[0];
  const date = day ? new Date(`${day}T00:00:00Z`) : null;
  if (!date || Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(language === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * The example in-store offer, black like the top pick: what it is, the code set large beside its
 * QR, how long it lasts and how to use it.
 */
export function CouponBlock({ coupon, language }: { coupon: Coupon; language: Language }) {
  const l = labels(language);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        marginTop: 22,
        borderRadius: 20,
        padding: "20px 20px 20px 24px",
        background: INK,
        color: "#fff",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 12px" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: fs(17), fontWeight: 500, color: ON_DARK_MUTED }}>
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: YELLOW }} />
            {l.inStoreOffer}
          </span>
          <span
            style={{ borderRadius: 999, padding: "3px 10px", background: "rgba(255, 255, 255, 0.12)", color: "#D6D9DE", fontSize: fs(14), fontWeight: 600 }}
          >
            {l.exampleOffer}
          </span>
        </div>
        <p style={{ marginTop: 10, fontSize: fs(22), fontWeight: 600, lineHeight: 1.3 }}>{coupon.label}</p>
        <p style={{ marginTop: 4, fontSize: fs(54), fontWeight: 700, lineHeight: 1.1, letterSpacing: "0.04em", fontVariantNumeric: "tabular-nums" }}>
          {coupon.code}
        </p>
        <p style={{ marginTop: 10, fontSize: fs(17), color: ON_DARK_MUTED }}>
          {l.validUntil} <span style={{ color: "#fff", fontWeight: 500 }}>{formatDate(coupon.valid_until, language)}</span>
        </p>
        <p style={{ marginTop: 2, fontSize: fs(17), color: ON_DARK_MUTED }}>{l.showInStore}</p>
      </div>
      <span style={{ flex: "none", borderRadius: 16, padding: 10, background: "#fff" }}>
        <Qr value={coupon.code} size={120} label={coupon.code} />
      </span>
    </div>
  );
}
