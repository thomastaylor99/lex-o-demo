"use client";

import { useEffect, useState } from "react";

import { formatCost, formatSeconds, labels } from "@/components/i18n";

import type { SkinProps } from "../types";
import { BUBBLE, CARD_SHADOW, fs, INK, MUTED } from "./theme";

/** A stat on a light grey pill: the label muted on the left, the value in ink on the right. */
function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <span
      className="fr-pop"
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 7,
        borderRadius: 999,
        padding: "8px 15px",
        background: BUBBLE,
        color: INK,
        whiteSpace: "nowrap",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <span style={{ fontSize: fs(15), color: MUTED }}>{label}</span>
      <span style={{ fontSize: fs(18), fontWeight: 600 }}>{value}</span>
    </span>
  );
}

/**
 * Whole seconds since the conversation screen appeared, frozen once the conversation stops running
 * (Stop). Restart unmounts the screen, so each visitor starts at zero.
 */
function useElapsed(running: boolean): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) return;
    const start = Date.now();
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  return seconds;
}

const clock = (seconds: number): string => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/**
 * How this conversation is going, at the foot of the right quarter and always in view: its
 * duration, the average reply and p90 (from the first reply on), and its running cost.
 */
export function SessionStats({ agent }: SkinProps) {
  const { language, replyStats: stats, costEur } = agent;
  const l = labels(language);
  const elapsed = useElapsed(agent.status === "live");
  const seconds = (ms: number | null) => (ms === null ? "" : formatSeconds(ms, language));

  return (
    <section
      className="fr-in"
      style={{ position: "sticky", bottom: 0, marginTop: "auto", borderRadius: 22, padding: 20, background: "#fff", boxShadow: CARD_SHADOW }}
    >
      <h2 style={{ fontSize: fs(22), fontWeight: 600, letterSpacing: "-0.015em", color: INK, marginBottom: 12 }}>{l.thisConversation}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        <StatPill label={l.duration} value={clock(elapsed)} />
        {stats.count > 0 && <StatPill label={l.avgReply} value={seconds(stats.averageMs)} />}
        {stats.count > 0 && <StatPill label={l.p90} value={seconds(stats.p90Ms)} />}
        <StatPill label={l.cost} value={formatCost(costEur, language)} />
      </div>
    </section>
  );
}
