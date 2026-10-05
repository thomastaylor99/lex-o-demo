"use client";

import { labels, type Labels } from "@/components/i18n";
import type { MicMode } from "@/lib/api";
import type { AgentActivity, AgentIdentity } from "@/lib/voice-agent";
import { fs, INK, ON_DARK_MUTED } from "@/skins/frost/theme";
import type { SkinProps } from "@/skins/types";

import { DockPresence } from "./DockPresence";
import { DockWave } from "./DockWave";
import { HoldButton } from "./HoldButton";
import { ModeSwitch } from "./ModeSwitch";
import { useHoldToTalk } from "./useHoldToTalk";

/** The dock's one status text: what is happening, or what the visitor can do now. */
function statusText(l: Labels, activity: AgentActivity, mode: MicMode, pressed: boolean): string {
  if (pressed) return l.talkNow;
  if (activity === "listening") return mode === "auto" ? l.justSpeak : l.activity.listening;
  if (activity === "idle" && mode === "push_to_talk") return `${l.holdToTalk}, ${l.holdHint}`;
  return l.activity[activity];
}

/**
 * The voice dock: presence and microphone in one black bar at the bottom of the conversation, where
 * the visitor talks. Left to right: who speaks, the waveform, one status text, the mode switch and,
 * in hold to talk, the hold button. A handover pulses a yellow ring around the bar.
 */
export function VoiceDock({ agent }: SkinProps) {
  const { agents, activeAgent, status, mode, setMode, language, pttDown, pttUp } = agent;
  const l = labels(language);
  const live = status === "live";
  const hold = mode === "push_to_talk";
  const { pressed, press, release } = useHoldToTalk({ enabled: live && hold, pttDown, pttUp });
  const activity: AgentActivity = live ? agent.activity : "idle";
  const text = statusText(l, activity, mode, pressed);
  const waiting: AgentIdentity = { id: "", displayName: l.advisor, roleLabel: l.activity.idle };
  // The agent that took over from the concierge: its handover plays once, keyed on its id.
  const arrived = activeAgent && agents.findIndex((a) => a.id === activeAgent.id) > 0 ? activeAgent : null;

  return (
    <div
      style={{
        position: "relative",
        flex: "none",
        display: "flex",
        alignItems: "center",
        gap: 24,
        height: 84,
        marginTop: 16,
        paddingRight: hold ? 14 : 19,
        borderRadius: 999,
        background: INK,
        color: "#fff",
        boxShadow: "0 14px 36px rgba(11, 11, 12, 0.14)",
      }}
    >
      {arrived && (
        <span key={`ring-${arrived.id}`} className="fr-ring" aria-hidden style={{ position: "absolute", inset: 0, borderRadius: 999, pointerEvents: "none" }} />
      )}
      <DockPresence agents={agents} activeAgent={activeAgent} arrived={arrived} waiting={waiting} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <DockWave activity={activity} />
      </span>
      <span role="status" aria-live="polite" style={{ flex: "none", display: "flex" }}>
        <span
          key={text}
          className="vd-swap"
          style={{ fontSize: fs(22), fontWeight: 500, whiteSpace: "nowrap", color: activity === "idle" && !hold ? ON_DARK_MUTED : "#fff" }}
        >
          {text}
        </span>
      </span>
      <ModeSwitch mode={mode} setMode={setMode} language={language} />
      {hold && <HoldButton pressed={pressed} disabled={!live} label={l.holdToTalk} press={press} release={release} />}
    </div>
  );
}
