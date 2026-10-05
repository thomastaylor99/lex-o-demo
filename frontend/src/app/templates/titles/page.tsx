import { Cormorant_Garamond, Geist } from "next/font/google";

import { labels } from "@/components/i18n";
import { ReplayIcon } from "@/skins/frost/icons";
import { FONT, INK, MUTED, SURFACE, TRACK } from "@/skins/frost/theme";
import { TITLES } from "@/templates/titles/variants";

const geist = Geist({ subsets: ["latin"], variable: "--font-frost" });
const serif = Cormorant_Garamond({
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-eclipse-display",
});

/** The Restart pill as the header draws it, for scale. */
function Restart() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        borderRadius: 999,
        padding: "9px 16px",
        background: "#fff",
        boxShadow: `inset 0 0 0 1px ${TRACK}`,
        color: INK,
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      <ReplayIcon size={15} />
      {labels("en").restart}
    </span>
  );
}

/** Five options for the conversation screen's title, each in a header strip at its real size, in English and French. */
export default function TitlesPage() {
  return (
    <main className={`${geist.variable} ${serif.variable}`} style={{ minHeight: "100vh", padding: "48px 56px 64px", background: SURFACE, fontFamily: FONT, color: INK }}>
      <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em" }}>The conversation screen&rsquo;s title: five options</h1>
      <p style={{ marginTop: 6, fontSize: 16, color: MUTED }}>Each at its real size in the header, in English then French.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 28, marginTop: 36, maxWidth: 1440 }}>
        {TITLES.map(({ id, name, note, Title }, index) => (
          <section key={id}>
            <p style={{ fontSize: 16, marginBottom: 10 }}>
              <span style={{ fontWeight: 600 }}>
                {index + 1}. {name}
              </span>
              <span style={{ color: MUTED }}> {note}</span>
            </p>
            <div style={{ display: "flex", flexDirection: "column", borderRadius: 22, background: "#fff", boxShadow: "0 1px 2px rgba(11, 11, 12, 0.04), 0 10px 30px rgba(11, 11, 12, 0.05)" }}>
              {(["en", "fr"] as const).map((language) => (
                <div
                  key={language}
                  lang={language}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 92, padding: "0 56px", borderTop: language === "fr" ? `1px solid ${TRACK}` : undefined }}
                >
                  <Title text={labels(language).advisor} />
                  {language === "en" && <Restart />}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
