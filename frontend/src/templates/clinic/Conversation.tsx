"use client";

import { useEffect, useRef } from "react";

import type { Language } from "@/lib/events";
import type { AgentActivity, AgentIdentity, ProductGroup, TranscriptEntry } from "@/lib/voice-agent";

import { ProductRow } from "./ProductRow";
import { BLUE, BLUE_TINT, BODY, CARD_SHADOW, DISPLAY, FAINT, MUTED, SURFACE, TEXT } from "./styles";

const ACTIVITY: Record<AgentActivity, string> = { idle: "Ready", listening: "Listening", thinking: "Thinking", speaking: "Speaking" };
const FADE = "linear-gradient(to bottom, transparent 0, #000 64px)";

function Presence({ agent, activity }: { agent: AgentIdentity | null; activity: AgentActivity }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, paddingBottom: 20 }}>
      <span style={{ position: "relative", width: 44, height: 44, display: "grid", placeItems: "center" }} aria-hidden>
        {(activity === "speaking" || activity === "listening") && (
          <span style={{ position: "absolute", inset: 8, borderRadius: 999, border: `2px solid ${BLUE}`, animation: `cl-ring ${activity === "speaking" ? 1.1 : 2.2}s ease-out infinite` }} />
        )}
        <span style={{ width: 14, height: 14, borderRadius: 999, background: activity === "idle" ? FAINT : BLUE }} />
      </span>
      <div>
        <h2 key={agent?.id} className="cl-pop" style={{ fontFamily: DISPLAY, fontSize: 38, lineHeight: 1.05, color: TEXT }}>
          {agent?.displayName ?? ""}
        </h2>
        <p style={{ fontFamily: BODY, fontSize: 15, color: MUTED, marginTop: 4, display: "flex", gap: 10, alignItems: "center" }}>
          {agent?.roleLabel}
          <span style={{ background: BLUE_TINT, color: BLUE, borderRadius: 999, padding: "2px 10px", fontWeight: 600 }}>
            {ACTIVITY[activity]}
            {activity === "thinking" && (
              <span aria-hidden>
                {[0, 1, 2].map((i) => (
                  <span key={i} style={{ animation: `cl-dots 1.2s ${i * 0.2}s infinite` }}>.</span>
                ))}
              </span>
            )}
          </span>
        </p>
      </div>
    </div>
  );
}

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
      <Presence agent={activeAgent} activity={activity} />
      <div ref={scroller} className="cl-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "8px 6px 12px 2px", maskImage: FADE, WebkitMaskImage: FADE }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, justifyContent: "flex-end", minHeight: "100%", fontFamily: BODY }}>
          {transcript.map((entry) => {
            if (entry.kind === "products") {
              const group = groups.find((g) => g.id === entry.groupId);
              return group ? <ProductRow key={entry.id} group={group} language={language} /> : null;
            }
            if (entry.kind === "handover") {
              return (
                <div key={entry.id} className="cl-fade" style={{ alignSelf: "center", background: BLUE_TINT, color: BLUE, borderRadius: 999, padding: "8px 18px", fontSize: 15, fontWeight: 600 }}>
                  {nameOf(entry.agent) || entry.text} joined
                </div>
              );
            }
            if (entry.kind === "visitor") {
              return (
                <div key={entry.id} className="cl-pop" style={{ alignSelf: "flex-end", maxWidth: "68%", background: SURFACE, borderRadius: 20, padding: "16px 20px" }}>
                  <p style={{ fontSize: 13, color: MUTED, marginBottom: 4 }}>You</p>
                  <p className={entry.final ? "" : "cl-caret"} style={{ fontSize: 22, lineHeight: 1.45, color: entry.final ? TEXT : FAINT }}>
                    {entry.text}
                  </p>
                </div>
              );
            }
            return (
              <div key={entry.id} className="cl-pop" style={{ alignSelf: "flex-start", maxWidth: "80%", background: "#fff", borderRadius: 20, borderLeft: `4px solid ${BLUE}`, boxShadow: CARD_SHADOW, padding: "16px 22px" }}>
                <p style={{ fontSize: 13, color: BLUE, fontWeight: 600, marginBottom: 4 }}>{nameOf(entry.agent)}</p>
                <p className={entry.final ? "" : "cl-caret"} style={{ fontSize: 24, lineHeight: 1.45, color: TEXT }}>
                  {entry.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
