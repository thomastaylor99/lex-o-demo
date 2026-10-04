"use client";

import { useState } from "react";

import { labels } from "@/components/i18n";
import type { Language } from "@/lib/events";
import type { AgentActivity, AgentIdentity, VoiceAgent } from "@/lib/voice-agent";

import { Orb } from "./Orb";
import { BUBBLE, WHITE, WHITE_64, YELLOW } from "./styles";

interface Swap {
  now: AgentIdentity | null;
  before: AgentIdentity | null;
}

/** Keeps the previous agent for one transition so the old role can fade out while the new one fades in. */
function useRoleSwap(agent: AgentIdentity | null): Swap {
  const [swap, setSwap] = useState<Swap>({ now: agent, before: null });
  if ((agent?.id ?? null) !== (swap.now?.id ?? null)) {
    const next = { now: agent, before: swap.now };
    setSwap(next);
    return next;
  }
  return swap;
}

function Role({ agent, leaving }: { agent: AgentIdentity; leaving?: boolean }) {
  return (
    <div className={leaving ? "ox-out" : "ox-in"} aria-hidden={leaving} style={{ gridArea: "1 / 1", animationDelay: leaving ? "0ms" : "180ms" }}>
      <h2 style={{ fontSize: 46, fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.015em", color: WHITE }}>{agent.displayName}</h2>
    </div>
  );
}

/** The active agent: the large orb top left, its role, and what it is doing right now. */
export function Presence(props: { agent: AgentIdentity | null; activity: AgentActivity; status: VoiceAgent["status"]; language: Language }) {
  const { agent, activity, status, language } = props;
  const swap = useRoleSwap(agent);
  const l = labels(language);
  const state = status === "starting" ? "Connecting" : l.activity[activity];
  const live = activity !== "idle";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 40, padding: "28px 0 20px 20px" }}>
      <Orb key={agent?.id ?? "none"} activity={activity} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "grid" }}>
          {swap.before && <Role key={`out-${swap.before.id}`} agent={swap.before} leaving />}
          {swap.now && <Role key={swap.now.id} agent={swap.now} />}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14 }}>
          {agent && (
            <span key={agent.id} className="ox-in" style={{ background: BUBBLE, color: WHITE_64, borderRadius: 999, padding: "6px 16px", fontSize: 18, fontWeight: 600 }}>
              {agent.roleLabel}
            </span>
          )}
          <span aria-live="polite" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 20, fontWeight: 600, color: live ? YELLOW : WHITE_64, transition: "color 300ms" }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: live ? YELLOW : WHITE_64, opacity: live ? 1 : 0.5, animation: live ? "ox-dot 1.4s ease-in-out infinite" : undefined }} />
            {state}
            {activity === "thinking" && (
              <span aria-hidden>
                {[0, 1, 2].map((i) => (
                  <span key={i} style={{ animation: `ox-dot 1.2s ${i * 0.2}s ease-in-out infinite` }}>.</span>
                ))}
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
