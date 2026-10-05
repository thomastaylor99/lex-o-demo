"use client";

import type { ReactNode } from "react";

import { labels } from "@/components/i18n";

import type { WelcomeProps } from "../types";
import { COPY } from "./copy";
import { ORBIT_CSS } from "./css";
import { Pearl } from "./Pearl";

export type Tone = "light" | "dark";

/** The two tones of the Orbit family. */
export const TONES = {
  light: {
    page: "radial-gradient(90% 70% at 50% 50%, #FFFFFF 0%, #F6F7F9 100%)",
    ink: "#0B0B0C",
    accent: "#0B0B0C",
    muted: "#6B7079",
    button: "#0B0B0C",
    buttonText: "#FFFFFF",
    dot: "#FFD23F",
    shadow: "0 16px 36px rgba(11, 11, 12, 0.16)",
  },
  dark: {
    page: "radial-gradient(80% 70% at 50% 45%, #1A1B20 0%, #08080A 70%, #030304 100%)",
    ink: "#F5F3EE",
    accent: "#FFE08A",
    muted: "rgba(245, 243, 238, 0.62)",
    button: "#FFD23F",
    buttonText: "#0B0B0C",
    dot: "#0B0B0C",
    shadow: "0 0 44px rgba(255, 210, 63, 0.35)",
  },
} as const;

const DISPLAY = "var(--font-orbit-display), Georgia, serif";
const BODY = "var(--font-orbit-body), system-ui, sans-serif";

/**
 * The Orbit family's page: the wordmark, the voice, "Beauty that listens", Begin, the privacy note
 * and Mistral's signature. `children` are the layers behind it; `voice` replaces the pearl.
 */
export function Frame({
  language,
  starting,
  failure,
  onBegin,
  tone = "light",
  voice,
  children,
}: WelcomeProps & { tone?: Tone; voice?: ReactNode; children?: ReactNode }) {
  const l = labels(language);
  const copy = COPY[language];
  const t = TONES[tone];
  const label = starting ? l.connecting : failure !== null ? l.tryAgain : l.begin;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", color: t.ink, fontFamily: BODY, background: t.page }}>
      <style>{ORBIT_CSS}</style>
      {children}

      <header className="ob-fade" style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "40px 60px 0" }}>
        <span style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.035em" }}>L&rsquo;Oréal</span>
          <span style={{ fontSize: 17, color: t.muted }}>{l.advisor}</span>
        </span>
        <span style={{ fontSize: 15, color: t.muted }}>{copy.kicker}</span>
      </header>

      <main style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", pointerEvents: "none" }}>
        <div className="ob-fade">{voice ?? <Pearl starting={starting} />}</div>
        <h1 style={{ marginTop: 28, fontFamily: DISPLAY, fontWeight: 400, fontSize: "clamp(76px, 6.6vw, 128px)", lineHeight: 1, letterSpacing: "-0.02em" }}>
          <span className="ob-rise" style={{ display: "block" }}>{copy.line1}</span>
          <span className="ob-rise" style={{ display: "block", fontStyle: "italic", color: t.accent, animationDelay: "160ms" }}>{copy.line2}</span>
        </h1>
        <p className="ob-rise" style={{ animationDelay: "300ms", marginTop: 24, maxWidth: "30em", fontSize: 21, lineHeight: 1.5, color: t.muted }}>
          {copy.sub}
        </p>
        {failure !== null && (
          <p role="alert" style={{ marginTop: 22, fontSize: 18 }}>
            {failure}
          </p>
        )}
        <div className="ob-rise" style={{ animationDelay: "440ms", marginTop: failure !== null ? 14 : 36, pointerEvents: "auto" }}>
          <button
            type="button"
            onClick={onBegin}
            disabled={starting}
            className="ob-press"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 14,
              borderRadius: 999,
              padding: "16px 40px 16px 18px",
              background: t.button,
              color: t.buttonText,
              fontSize: 20,
              fontWeight: 600,
              cursor: starting ? "progress" : "pointer",
              boxShadow: t.shadow,
            }}
          >
            <span aria-hidden style={{ width: 14, height: 14, borderRadius: 999, background: t.dot, boxShadow: tone === "light" ? `0 0 14px ${t.dot}` : "none" }} />
            <span className="ob-motion" style={{ animation: starting ? "ob-dim 1.2s ease-in-out infinite" : undefined }}>{label}</span>
          </button>
        </div>
        <p className="ob-fade" style={{ animationDelay: "560ms", marginTop: 14, fontSize: 15, color: t.muted }}>
          {l.welcomeNote}
        </p>
      </main>

      <footer className="ob-fade" style={{ position: "absolute", bottom: 32, left: 0, right: 0, textAlign: "center", fontSize: 14, color: t.muted }}>
        {copy.signature}
      </footer>
    </div>
  );
}
