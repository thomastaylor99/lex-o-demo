import { labels } from "@/components/i18n";
import type { Language } from "@/lib/events";
import type { Recap } from "@/lib/voice-agent";

import { CouponBlock } from "./CouponBlock";
import { BUBBLE, CARD_SHADOW, INK, MUTED, TEXT_2, fs } from "./theme";

/**
 * The email recap as a preview card: the masked address it would go to, the subject, the body and
 * the in-store offer. Nothing is sent, and the note beside the title says so.
 */
export function RecapPreview({ recap, language }: { recap: Recap; language: Language }) {
  const l = labels(language);
  // A blank line separates paragraphs; a single line break inside one is kept.
  const paragraphs = recap.body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <section className="fr-in" style={{ alignSelf: "stretch", minWidth: 0, margin: "6px 0 0" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h3 style={{ fontSize: fs(24), fontWeight: 600, letterSpacing: "-0.015em", color: INK }}>{l.recapTitle}</h3>
        <span style={{ borderRadius: 999, padding: "4px 12px", background: BUBBLE, color: MUTED, fontSize: fs(15), fontWeight: 500 }}>
          {l.recapPreview}
        </span>
      </div>
      <article style={{ maxWidth: 880, borderRadius: 24, padding: "20px 26px 26px", background: "#fff", boxShadow: CARD_SHADOW, color: INK }}>
        <p
          style={{
            display: "inline-flex",
            alignItems: "baseline",
            gap: 10,
            maxWidth: "100%",
            borderRadius: 999,
            padding: "6px 15px",
            background: BUBBLE,
            fontSize: fs(17),
          }}
        >
          <span style={{ color: MUTED }}>{l.recapTo}</span>
          <span style={{ minWidth: 0, fontWeight: 500, overflowWrap: "anywhere" }}>{recap.emailMasked}</span>
        </p>
        <h4 style={{ marginTop: 14, fontSize: fs(30), fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.015em" }}>{recap.subject}</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          {paragraphs.map((paragraph, index) => (
            <p key={index} style={{ fontSize: fs(21), lineHeight: 1.5, color: TEXT_2, whiteSpace: "pre-line", textWrap: "pretty" }}>
              {paragraph}
            </p>
          ))}
        </div>
        <CouponBlock coupon={recap.coupon} language={language} />
      </article>
    </section>
  );
}
