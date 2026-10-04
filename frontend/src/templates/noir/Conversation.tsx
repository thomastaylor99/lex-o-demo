"use client";

import { useEffect, useRef } from "react";

import type { Language } from "@/lib/events";
import type { AgentActivity, AgentIdentity, ProductGroup, TranscriptEntry } from "@/lib/voice-agent";

import { Orb } from "./Orb";
import { ProductRow } from "./ProductRow";
import { BODY, CHAMPAGNE, CHAMPAGNE_LINE, DISPLAY, FAINT, IVORY, MUTED } from "./styles";

const ACTIVITY: Record<AgentActivity, string> = { idle: "At your service", listening: "Listening", thinking: "Thinking", speaking: "Speaking" };
const FADE = "linear-gradient(to bottom, transparent 0, #000 14%)";

export function Conversation(props: {
  transcript: TranscriptEntry[];
  groups: ProductGroup[];
  agents: AgentIdentity[];
  activeAgent: AgentIdentity | null;
  activity: AgentActivity;
  language: Language;
}) {
  const { transcript, groups, agents, activeAgent, activity, language } = props;
  const scroller = useRef<HTMLDivElement>(null);
  const last = transcript.at(-1)?.text;
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [transcript.length, last]);
  const nameOf = (id: string | null) => agents.find((a) => a.id === id)?.displayName ?? "";

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 26, paddingBottom: 18 }}>
        <Orb activity={activity} />
        <div>
          <h2 key={activeAgent?.id} className="nr-pop" style={{ fontFamily: DISPLAY, fontSize: 50, lineHeight: 1, color: IVORY }}>
            {activeAgent?.displayName}
          </h2>
          <p style={{ fontFamily: BODY, fontSize: 15, letterSpacing: "0.04em", color: MUTED, marginTop: 8 }}>
            {activeAgent?.roleLabel} <span style={{ color: CHAMPAGNE, marginLeft: 10 }}>{ACTIVITY[activity]}</span>
          </p>
        </div>
      </div>

      <div ref={scroller} className="nr-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", maskImage: FADE, WebkitMaskImage: FADE }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 26, minHeight: "100%", paddingTop: 80, paddingBottom: 12, fontFamily: BODY }}>
          {transcript.map((entry) => {
            if (entry.kind === "products") {
              const group = groups.find((g) => g.id === entry.groupId);
              return group ? <ProductRow key={entry.id} group={group} language={language} /> : null;
            }
            if (entry.kind === "handover") {
              return (
                <div key={entry.id} className="nr-fade" style={{ display: "flex", alignItems: "center", gap: 18, color: CHAMPAGNE, fontSize: 15, letterSpacing: "0.06em" }}>
                  <span style={{ flex: 1, height: 1, background: CHAMPAGNE_LINE }} />
                  {nameOf(entry.agent) || entry.text} joins
                  <span style={{ flex: 1, height: 1, background: CHAMPAGNE_LINE }} />
                </div>
              );
            }
            if (entry.kind === "visitor") {
              return (
                <p key={entry.id} className={`nr-pop ${entry.final ? "" : "nr-caret"}`} style={{ alignSelf: "flex-end", maxWidth: "62%", textAlign: "right", fontSize: 22, lineHeight: 1.5, color: entry.final ? MUTED : FAINT }}>
                  {entry.text}
                </p>
              );
            }
            return (
              <p key={entry.id} className={`nr-pop ${entry.final ? "" : "nr-caret"}`} style={{ maxWidth: "84%", fontFamily: DISPLAY, fontSize: 36, lineHeight: 1.28, color: IVORY }}>
                {entry.text}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}
