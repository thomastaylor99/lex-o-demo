"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { labels } from "@/components/i18n";
import { looksLikeEmail } from "@/lib/email";
import type { EmailResult } from "@/lib/voice-agent";

import type { SkinProps } from "../types";
import { CARD_SHADOW, fs, INK, MUTED, YELLOW } from "./theme";

type Problem = Extract<EmailResult, { ok: false }>["error"];

/**
 * Where the visitor types their address for the recap (spec 006): shown once they agreed to save
 * their profile, until the recap is on screen or the visitor closes it ("No thanks" or Escape).
 * It takes the focus when it appears; Enter or the button sends it. The browser never stores or
 * suggests what was typed (the next visitor must not see it). An address holds no space, so Space
 * keeps driving hold-to-talk while the field has the focus.
 */
export function EmailField({ agent }: SkinProps) {
  const { status, profile, recap, language, submitEmail } = agent;
  const l = labels(language);
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const open = status === "live" && profile?.consent === "given" && recap === null && !dismissed;

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  if (!open) return null;

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (sending) return;
    if (!looksLikeEmail(value)) {
      setProblem("invalid_email");
      return;
    }
    setSending(true);
    setProblem(null);
    const result = await submitEmail(value.trim());
    setSending(false);
    if (!result.ok) setProblem(result.error);
  };

  return (
    <form
      noValidate
      autoComplete="off"
      onSubmit={send}
      onKeyDown={(event) => {
        if (event.key === "Escape") setDismissed(true);
      }}
      className="fr-in"
      style={{
        alignSelf: "flex-start",
        width: "min(100%, 780px)",
        display: "flex",
        alignItems: "center",
        gap: 14,
        marginTop: 14,
        borderRadius: 999,
        padding: "8px 8px 8px 28px",
        background: "#fff",
        boxShadow: `0 0 0 2px ${INK}, ${CARD_SHADOW}`,
      }}
    >
      <label style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 12, fontSize: fs(15), fontWeight: 500, color: MUTED }}>
          {l.emailLabel}
          {problem && (
            <span role="alert" className="fr-in" style={{ display: "inline-flex", alignItems: "center", gap: 7, color: INK }}>
              <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: YELLOW }} />
              {problem === "invalid_email" ? l.emailInvalid : l.emailFailed}
            </span>
          )}
        </span>
        <input
          ref={input}
          type="text"
          inputMode="email"
          name="recap-address"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          data-voice-keys="on"
          data-1p-ignore
          data-lpignore="true"
          value={value}
          disabled={sending}
          aria-invalid={problem === "invalid_email"}
          placeholder={l.emailPlaceholder}
          onChange={(event) => {
            setValue(event.target.value.replace(/\s+/g, ""));
            setProblem(null);
          }}
          style={{ width: "100%", border: 0, outline: "none", padding: 0, background: "transparent", fontFamily: "inherit", fontSize: fs(25), fontWeight: 500, color: INK }}
        />
      </label>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        disabled={sending}
        className="fr-press"
        style={{ flex: "none", borderRadius: 999, padding: "15px 18px", background: "transparent", color: MUTED, fontSize: fs(17), fontWeight: 500, cursor: "pointer" }}
      >
        {l.emailDismiss}
      </button>
      <button
        type="submit"
        disabled={sending || value.trim() === ""}
        className="fr-press"
        style={{
          flex: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          borderRadius: 999,
          padding: "15px 24px",
          background: INK,
          color: "#fff",
          fontSize: fs(18),
          fontWeight: 600,
          cursor: sending ? "default" : "pointer",
          opacity: value.trim() === "" && !sending ? 0.45 : 1,
          transition: "opacity 200ms",
        }}
      >
        <span aria-hidden className={sending ? "fr-breathe" : undefined} style={{ width: 8, height: 8, borderRadius: 999, background: YELLOW }} />
        {sending ? l.emailPreparing : l.emailSend}
      </button>
    </form>
  );
}
