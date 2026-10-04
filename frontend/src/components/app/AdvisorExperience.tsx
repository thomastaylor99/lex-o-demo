"use client";

import { useEffect, useRef, useState } from "react";

import type { VoiceAgent } from "@/lib/voice-agent";
import { labels } from "@/components/i18n";
import { Header } from "@/components/app/Header";
import { WelcomeScreen } from "@/components/app/WelcomeScreen";
import { AgentPresence } from "@/components/conversation/AgentPresence";
import { TalkControl } from "@/components/conversation/TalkControl";
import { Transcript } from "@/components/conversation/Transcript";
import { DiscoveryPanel } from "@/components/discovery/DiscoveryPanel";
import { ProfileStrip } from "@/components/profile/ProfileStrip";

/** The V1 screen (spec 003): conversation left, discovery right, profile along the bottom. */
export function AdvisorExperience({ agent }: { agent: VoiceAgent }) {
  const t = labels(agent.language);
  const [holding, setHolding] = useState(false);

  // The space bar drives hold-to-talk. Refs keep the listeners stable across renders.
  const live = useRef(agent);
  useEffect(() => {
    live.current = agent;
  });
  useEffect(() => {
    const isSpace = (e: KeyboardEvent) => e.code === "Space";
    const typing = (e: KeyboardEvent) =>
      e.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName);
    const down = (e: KeyboardEvent) => {
      const a = live.current;
      if (!isSpace(e) || typing(e) || a.status !== "live" || a.mode !== "push_to_talk") return;
      e.preventDefault();
      if (e.repeat) return;
      setHolding(true);
      a.pttDown();
    };
    const up = (e: KeyboardEvent) => {
      const a = live.current;
      if (!isSpace(e) || typing(e) || a.mode !== "push_to_talk") return;
      e.preventDefault();
      setHolding(false);
      a.pttUp();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  if (agent.status === "idle" || agent.status === "starting") {
    return <WelcomeScreen onBegin={() => void agent.start()} starting={agent.status === "starting"} t={t} />;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header lastReplyMs={agent.lastReplyMs} onEnd={() => void agent.end()} t={t} language={agent.language} />

      {agent.error && (
        <p className="animate-fade border-b border-copper/30 bg-copper-glow/30 px-16 py-2 text-[15px] text-ink-soft">
          {agent.error}
        </p>
      )}

      <main className="grid min-h-0 flex-1 grid-cols-[3fr_2fr]">
        <section className="flex min-h-0 flex-col gap-8 px-16 pb-8 pt-10">
          <AgentPresence agent={agent.activeAgent} activity={agent.activity} t={t} />
          <Transcript entries={agent.transcript} agents={agent.agents} t={t} />
          <TalkControl
            mode={agent.mode}
            setMode={agent.setMode}
            activity={agent.activity}
            holding={holding}
            pttDown={agent.pttDown}
            pttUp={agent.pttUp}
            t={t}
          />
        </section>
        <aside className="min-h-0 border-l border-hairline bg-ivory/35 px-14 pb-8 pt-10">
          <DiscoveryPanel groups={agent.productGroups} basket={agent.basket} t={t} language={agent.language} />
        </aside>
      </main>

      <ProfileStrip profile={agent.profile} t={t} language={agent.language} />
    </div>
  );
}
