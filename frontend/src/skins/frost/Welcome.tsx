"use client";

import { labels } from "@/components/i18n";
import type { AgentActivity } from "@/lib/voice-agent";

import type { SkinProps } from "../types";
import { ErrorNotice } from "./ErrorBanner";
import { Wordmark } from "./Header";
import { MicIcon, SparkleIcon } from "./icons";
import { fs, INK, MUTED, YELLOW } from "./theme";
import { Waveform } from "./Waveform";

/** A yellow marker band under the second half of the title: Frost's accent, in Geist only. */
const MARKER = `linear-gradient(to bottom, transparent 56%, ${YELLOW} 56%, ${YELLOW} 88%, transparent 88%)`;

/** The black capsule of the conversation screen, waiting: the yellow voice rests, and travels while connecting. */
function Capsule({ activity }: { activity: AgentActivity }) {
  return (
    <div
      aria-hidden
      className="fr-pop"
      style={{
        width: 520,
        maxWidth: "100%",
        height: 104,
        display: "flex",
        alignItems: "center",
        gap: 22,
        padding: "0 32px 0 16px",
        borderRadius: 999,
        background: INK,
        color: "#fff",
        boxShadow: "0 26px 60px rgba(11, 11, 12, 0.18)",
      }}
    >
      <span style={{ flex: "0 0 72px", height: 72, display: "grid", placeItems: "center", borderRadius: 999, background: YELLOW, color: INK }}>
        <SparkleIcon size={32} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <Waveform activity={activity} bars={44} height={52} />
      </span>
    </div>
  );
}

/**
 * The first screen, and the one Restart returns to. Browsers allow the microphone and audio only
 * after a click, so Begin starts the session. A failed start says why and offers Try again.
 */
export function Welcome({ agent }: SkinProps) {
  const { language, status, error, start } = agent;
  const l = labels(language);
  const starting = status === "starting";
  const failure = status === "error" ? (error ?? "") : null;
  const label = starting ? l.connecting : failure !== null ? l.tryAgain : l.begin;

  return (
    <div style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, padding: "22px 56px 40px" }}>
      <header style={{ paddingBottom: 14 }}>
        <Wordmark advisor={l.advisor} />
      </header>

      <main style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <Capsule activity={starting ? "thinking" : "idle"} />

        <h1 className="fr-in" style={{ marginTop: 56, fontSize: fs(96), fontWeight: 700, lineHeight: 1.04, letterSpacing: "-0.04em", color: INK }}>
          {l.welcomeTitle}
          <br />
          <span style={{ backgroundImage: MARKER, padding: "0 0.06em", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>
            {l.welcomeTitleItalic}
          </span>
        </h1>

        <p className="fr-in" style={{ animationDelay: "120ms", maxWidth: "34em", marginTop: 28, fontSize: fs(28), lineHeight: 1.45, color: MUTED }}>
          {l.welcomeBody}
        </p>

        {failure !== null && (
          <div style={{ marginTop: 36 }}>
            <ErrorNotice error={failure} language={language} />
          </div>
        )}

        {/* The entrance animation sits on a wrapper: on the button it would override the press effect. */}
        <div className="fr-in" style={{ animationDelay: "240ms", marginTop: failure !== null ? 20 : 48 }}>
          <button
            type="button"
            disabled={starting}
            onClick={() => void start()}
            className="fr-press"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 14,
              borderRadius: 999,
              padding: "9px 34px 9px 9px",
              background: INK,
              color: "#fff",
              fontSize: fs(26),
              fontWeight: 600,
              cursor: starting ? "progress" : "pointer",
              boxShadow: "0 18px 40px rgba(11, 11, 12, 0.16)",
            }}
          >
            <span aria-hidden style={{ width: 50, height: 50, display: "grid", placeItems: "center", borderRadius: 999, background: YELLOW, color: INK }}>
              <MicIcon size={24} />
            </span>
            <span className={starting ? "fr-breathe" : undefined}>{label}</span>
          </button>
        </div>

        <p className="fr-in" style={{ animationDelay: "320ms", marginTop: 18, fontSize: fs(20), color: MUTED }}>
          {l.welcomeNote}
        </p>
      </main>
    </div>
  );
}
