"use client";

import { labels } from "@/components/i18n";

import type { WelcomeProps } from "../types";
import { COPY } from "./copy";
import { MAISON_CSS } from "./css";
import { VoiceLine } from "./VoiceLine";

const INK = "#0A0A0A";
const MUTED = "#6E6E6E";
const DISPLAY = "var(--font-maison-display), Didot, serif";
const BODY = "var(--font-maison-body), system-ui, sans-serif";

/**
 * Maison: haute couture on white. A couture house's invitation set in a large serif, one fine
 * line for the voice, a black pill to begin, and Mistral's signature at the foot of the page.
 */
export function MaisonWelcome({ language, starting, failure, onBegin }: WelcomeProps) {
  const l = labels(language);
  const copy = COPY[language];
  const label = starting ? l.connecting : failure !== null ? l.tryAgain : l.begin;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", background: "#fff", color: INK, fontFamily: BODY }}>
      <style>{MAISON_CSS}</style>

      <header className="ma-fade" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "44px 64px 0" }}>
        <span style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
          <span style={{ fontFamily: DISPLAY, fontSize: 40, fontWeight: 600, letterSpacing: "-0.01em" }}>L&rsquo;Oréal</span>
          <span style={{ fontSize: 16, color: MUTED, letterSpacing: "0.02em" }}>{l.advisor}</span>
        </span>
        <span style={{ fontSize: 15, color: MUTED, letterSpacing: "0.02em" }}>{copy.kicker}</span>
      </header>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 64px" }}>
        <h1 style={{ fontFamily: DISPLAY, fontWeight: 400, fontSize: "clamp(84px, 8.4vw, 168px)", lineHeight: 0.98, letterSpacing: "-0.025em" }}>
          <span className="ma-rise" style={{ display: "block" }}>{copy.line1}</span>
          <span className="ma-rise" style={{ display: "block", fontStyle: "italic", animationDelay: "180ms" }}>{copy.line2}</span>
        </h1>

        <p className="ma-rise" style={{ animationDelay: "360ms", marginTop: 34, maxWidth: "32em", fontSize: 22, lineHeight: 1.5, color: MUTED }}>
          {copy.sub}
        </p>

        <div className="ma-fade" style={{ animationDelay: "520ms", marginTop: 46 }}>
          <VoiceLine starting={starting} />
        </div>

        {failure !== null && (
          <p role="alert" style={{ marginTop: 30, fontSize: 18, color: INK }}>
            {failure}
          </p>
        )}

        <div className="ma-rise" style={{ animationDelay: "640ms", marginTop: failure !== null ? 18 : 44 }}>
          <button
            type="button"
            onClick={onBegin}
            disabled={starting}
            className="ma-press"
            style={{
              minWidth: 220,
              borderRadius: 999,
              padding: "20px 52px",
              background: INK,
              color: "#fff",
              fontFamily: BODY,
              fontSize: 20,
              fontWeight: 500,
              letterSpacing: "0.02em",
              cursor: starting ? "progress" : "pointer",
            }}
          >
            <span style={{ animation: starting ? "ma-dim 1.2s ease-in-out infinite" : undefined }}>{label}</span>
          </button>
        </div>
        <p className="ma-fade" style={{ animationDelay: "760ms", marginTop: 16, fontSize: 15, color: MUTED }}>
          {l.welcomeNote}
        </p>
      </main>

      <footer className="ma-fade" style={{ animationDelay: "900ms", padding: "0 64px 38px", textAlign: "center", fontSize: 14, color: MUTED, letterSpacing: "0.02em" }}>
        {copy.signature}
      </footer>
    </div>
  );
}
