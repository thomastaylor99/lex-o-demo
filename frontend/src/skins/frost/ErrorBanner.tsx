"use client";

import { useEffect, useState } from "react";

import { labels, type Labels } from "@/components/i18n";
import type { Language } from "@/lib/events";

import type { SkinProps } from "../types";
import { fs, INK, YELLOW } from "./theme";

const HIDE_AFTER_MS = 6000;

/** Engine errors that come from the microphone: permission refused, no device, or no media API on the page. */
const MIC_ERROR = /microphone|\bmic\b|permission|denied|not allowed|getusermedia|mediadevices|audio source|device not found/i;

/** The engine's error, technical and in English, as one plain sentence in the conversation language. */
export function errorText(error: string, l: Labels): string {
  return MIC_ERROR.test(error) ? l.errorMic : l.errorGeneric;
}

/** How the skin shows a problem: a black pill with a yellow mark. The technical detail stays in the tooltip. */
export function ErrorNotice({ error, language }: { error: string; language: Language }) {
  return (
    <div
      role="alert"
      title={error}
      className="fr-in"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        borderRadius: 999,
        padding: "7px 18px 7px 7px",
        background: INK,
        color: "#fff",
        fontSize: fs(20),
        fontWeight: 500,
      }}
    >
      <span
        aria-hidden
        style={{ width: 26, height: 26, display: "grid", placeItems: "center", borderRadius: 999, background: YELLOW, color: INK, fontSize: fs(16), fontWeight: 700 }}
      >
        !
      </span>
      {errorText(error, labels(language))}
    </div>
  );
}

/** One error, shown for about six seconds. */
function TimedNotice({ error, language }: { error: string; language: Language }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), HIDE_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingBottom: 14 }}>
      <ErrorNotice error={error} language={language} />
    </div>
  );
}

/** An error during the conversation, in the visitor's language. Keyed on the error, so a new one shows again. */
export function ErrorBanner({ agent }: SkinProps) {
  if (!agent.error) return null;
  return <TimedNotice key={agent.error} error={agent.error} language={agent.language} />;
}
