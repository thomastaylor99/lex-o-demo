"use client";

import { labels } from "@/components/i18n";

import type { WelcomeProps } from "../types";
import { COPY, WINDOW } from "./copy";
import { VITRINE_CSS } from "./css";
import { Niche } from "./Niche";

const WARM = "#F6EFE4";
const MUTED = "rgba(246, 239, 228, 0.6)";
const GOLD = "#E2C07E";
const DISPLAY = "var(--font-vitrine-display), Didot, serif";
const BODY = "var(--font-vitrine-body), system-ui, sans-serif";

/**
 * Vitrine: a Paris boutique window at night. Six real products in lit niches on a glossy shelf,
 * a gold pill to begin, a sweep of light across the window while the session connects.
 */
export function VitrineWelcome({ language, starting, failure, onBegin }: WelcomeProps) {
  const l = labels(language);
  const copy = COPY[language];
  const label = starting ? l.connecting : failure !== null ? l.tryAgain : l.begin;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        color: WARM,
        fontFamily: BODY,
        background: "radial-gradient(120% 80% at 50% 0%, #1D1812 0%, #0A0908 55%, #040404 100%)",
      }}
    >
      <style>{VITRINE_CSS}</style>

      <header className="vi-fade" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "40px 64px 0" }}>
        <span style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <span style={{ fontFamily: DISPLAY, fontSize: 40, fontWeight: 600 }}>L&rsquo;Oréal</span>
          <span style={{ fontFamily: DISPLAY, fontSize: 19, fontStyle: "italic", color: GOLD }}>{l.advisor}</span>
        </span>
        <span style={{ fontSize: 15, color: MUTED, letterSpacing: "0.02em" }}>{copy.kicker}</span>
      </header>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 64px" }}>
        <h1 style={{ fontFamily: DISPLAY, fontWeight: 400, fontSize: "clamp(64px, 5.6vw, 108px)", lineHeight: 1.04, letterSpacing: "-0.015em" }}>
          <span className="vi-rise" style={{ display: "block" }}>{copy.line1}</span>
          <span className="vi-rise" style={{ display: "block", fontStyle: "italic", color: GOLD, animationDelay: "160ms" }}>{copy.line2}</span>
        </h1>
        <p className="vi-rise" style={{ animationDelay: "300ms", marginTop: 22, maxWidth: "34em", fontSize: 21, lineHeight: 1.5, color: MUTED }}>
          {copy.sub}
        </p>

        <div style={{ position: "relative", marginTop: 64, display: "flex", gap: 34, alignItems: "flex-end" }}>
          {WINDOW.map((id, index) => (
            <Niche key={id} id={id} index={index} />
          ))}
          <span
            aria-hidden
            style={{ position: "absolute", left: -40, right: -40, top: 248, height: 2, background: "linear-gradient(90deg, transparent, rgba(226, 192, 126, 0.45), transparent)" }}
          />
          {starting && (
            <span
              aria-hidden
              className="vi-motion"
              style={{
                position: "absolute",
                top: -20,
                bottom: 60,
                left: 0,
                width: "24%",
                background: "linear-gradient(90deg, transparent, rgba(255, 240, 210, 0.22), transparent)",
                animation: "vi-sweep 1.6s ease-in-out infinite",
                pointerEvents: "none",
              }}
            />
          )}
        </div>

        {failure !== null && (
          <p role="alert" style={{ marginTop: 8, fontSize: 18, color: "#F2B49C" }}>
            {failure}
          </p>
        )}
        <div className="vi-rise" style={{ animationDelay: "1100ms", marginTop: failure !== null ? 14 : 18, display: "flex", alignItems: "center", gap: 22 }}>
          <button
            type="button"
            onClick={onBegin}
            disabled={starting}
            className="vi-press"
            style={{
              minWidth: 220,
              borderRadius: 999,
              padding: "19px 50px",
              background: "linear-gradient(180deg, #F6E2B3 0%, #D6AA62 100%)",
              color: "#1E150A",
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: "0.02em",
              cursor: starting ? "progress" : "pointer",
              boxShadow: "0 0 30px rgba(226, 184, 101, 0.28)",
            }}
          >
            <span className="vi-motion" style={{ animation: starting ? "vi-dim 1.2s ease-in-out infinite" : undefined }}>{label}</span>
          </button>
          <span style={{ fontSize: 15, color: MUTED }}>{l.welcomeNote}</span>
        </div>
      </main>

      <footer className="vi-fade" style={{ animationDelay: "1300ms", padding: "18px 64px 34px", textAlign: "center", fontSize: 14, color: MUTED, letterSpacing: "0.02em" }}>
        {copy.signature}
      </footer>
    </div>
  );
}
