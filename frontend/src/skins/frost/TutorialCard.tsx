import { labels } from "@/components/i18n";
import type { Language, TutorialView } from "@/lib/events";

import { ExternalIcon } from "./icons";
import { PlatformMark } from "./PlatformMark";
import { Qr } from "./Qr";
import { CLAMP_2, INK, MUTED, SURFACE, YELLOW, fs } from "./theme";

const BADGE = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 999,
  padding: "4px 11px",
  fontSize: fs(14),
  fontWeight: 600,
  whiteSpace: "nowrap",
} as const;

/**
 * One tutorial: the platform's mark, the creator with an "Official" badge for the brand's own
 * account, the video title, and a code to scan to watch it on a phone. The whole card is a link
 * that opens the video in a new tab, so the conversation keeps running in this one.
 */
export function TutorialCard({ tutorial, language, delayMs }: { tutorial: TutorialView; language: Language; delayMs: number }) {
  const l = labels(language);
  const official = tutorial.creator_kind === "brand";

  return (
    // The entrance animation sits on the wrapper: on the link it would override the hover lift.
    <div className="fr-in" style={{ animationDelay: `${delayMs}ms`, flex: "0 0 296px", display: "flex" }}>
      <a
        href={tutorial.url}
        target="_blank"
        rel="noopener noreferrer"
        className="fr-press"
        aria-label={`${l.watch}: ${tutorial.title} (${tutorial.creator})`}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          borderRadius: 20,
          padding: 12,
          background: SURFACE,
          color: INK,
          textDecoration: "none",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 4px 0" }}>
          <PlatformMark platform={tutorial.platform} size={46} />
          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 5 }}>
            <p style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: fs(19), fontWeight: 600 }}>
              {tutorial.creator}
            </p>
            {official ? (
              <span style={{ ...BADGE, paddingLeft: 9, background: INK, color: "#fff" }}>
                <span aria-hidden style={{ width: 7, height: 7, borderRadius: 999, background: YELLOW }} />
                {l.official}
              </span>
            ) : (
              <span style={{ ...BADGE, background: "#fff", color: MUTED }}>{l.creator}</span>
            )}
          </div>
        </div>
        <h4 style={{ ...CLAMP_2, padding: "0 4px", fontSize: fs(20), fontWeight: 500, lineHeight: 1.3, letterSpacing: "-0.01em" }}>{tutorial.title}</h4>
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 14, borderRadius: 14, padding: 10, background: "#fff" }}>
          <Qr value={tutorial.url} size={100} label={tutorial.url} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
            <p style={{ fontSize: fs(16), fontWeight: 500, lineHeight: 1.3, color: MUTED }}>{l.scanToWatch}</p>
            <span style={{ ...BADGE, padding: "7px 14px", background: INK, color: "#fff", fontSize: fs(17) }}>
              {l.watch}
              <ExternalIcon size={15} />
            </span>
          </div>
        </div>
      </a>
    </div>
  );
}
