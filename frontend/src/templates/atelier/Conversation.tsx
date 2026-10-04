"use client";

import { useEffect, useRef } from "react";

import type { Language } from "@/lib/events";
import type { AgentActivity, AgentIdentity, ProductGroup, TranscriptEntry } from "@/lib/voice-agent";

import { ProductRow } from "./ProductRow";
import { GREY, INK, LIGHT, RED, SANS, SERIF } from "./styles";

function VoiceDot({ activity }: { activity: AgentActivity }) {
  const live = activity !== "idle";
  return (
    <span style={{ position: "relative", width: 18, height: 18, display: "inline-block" }} aria-hidden>
      {activity === "speaking" && (
        <span style={{ position: "absolute", inset: 0, borderRadius: 999, border: `1.5px solid ${RED}`, animation: "at-pulse 1.2s ease-out infinite" }} />
      )}
      {activity === "thinking" && (
        <span style={{ position: "absolute", inset: -4, borderRadius: 999, border: "1.5px solid transparent", borderTopColor: RED, animation: "at-spin 0.9s linear infinite" }} />
      )}
      <span
        style={{
          position: "absolute",
          inset: 4,
          borderRadius: 999,
          background: live ? RED : LIGHT,
          animation: activity === "listening" ? "at-breathe 2.4s ease-in-out infinite" : undefined,
        }}
      />
    </span>
  );
}

const ACTIVITY: Record<AgentActivity, string> = { idle: "Ready", listening: "Listening", thinking: "Thinking", speaking: "Speaking" };

export function Conversation({
  transcript,
  groups,
  agents,
  activeAgent,
  activity,
  language,
}: {
  transcript: TranscriptEntry[];
  groups: ProductGroup[];
  agents: AgentIdentity[];
  activeAgent: AgentIdentity | null;
  activity: AgentActivity;
  language: Language;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const last = transcript.at(-1)?.text;
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [transcript.length, last]);
  const nameOf = (id: string | null) => agents.find((a) => a.id === id)?.displayName ?? "";

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, paddingBottom: 22, borderBottom: `1px solid ${INK}` }}>
        <VoiceDot activity={activity} />
        <h2 key={activeAgent?.id} className="at-pop" style={{ fontFamily: SERIF, fontSize: 44, lineHeight: 1, color: INK }}>
          {activeAgent?.displayName ?? ""}
        </h2>
        <span style={{ fontFamily: SANS, fontSize: 16, color: GREY, marginLeft: 6 }}>
          {activeAgent?.roleLabel} <span style={{ color: activity === "idle" ? GREY : RED, marginLeft: 10 }}>{ACTIVITY[activity]}</span>
        </span>
      </div>

      <div ref={scroller} className="at-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "28px 8px 12px 0" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 28, justifyContent: "flex-end", minHeight: "100%" }}>
          {transcript.map((entry) => {
            if (entry.kind === "products") {
              const group = groups.find((g) => g.id === entry.groupId);
              return group ? <ProductRow key={entry.id} group={group} language={language} /> : null;
            }
            if (entry.kind === "handover") {
              return (
                <div key={entry.id} className="at-fade" style={{ display: "flex", alignItems: "center", gap: 18 }}>
                  <span style={{ flex: 1, height: 1, background: LIGHT }} />
                  <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 20, color: GREY }}>
                    {nameOf(entry.agent) || entry.text} joins
                  </span>
                  <span style={{ flex: 1, height: 1, background: LIGHT }} />
                </div>
              );
            }
            if (entry.kind === "visitor") {
              return (
                <div key={entry.id} className="at-pop" style={{ alignSelf: "flex-end", maxWidth: "70%", textAlign: "right" }}>
                  <p style={{ fontFamily: SANS, fontSize: 13, color: GREY, marginBottom: 6 }}>You</p>
                  <p className={entry.final ? "" : "at-caret"} style={{ fontFamily: SANS, fontSize: 23, lineHeight: 1.4, color: entry.final ? "#333" : "#A0A0A0" }}>
                    {entry.text}
                  </p>
                </div>
              );
            }
            return (
              <div key={entry.id} className="at-pop" style={{ maxWidth: "88%" }}>
                <p style={{ fontFamily: SANS, fontSize: 13, color: GREY, marginBottom: 6 }}>{nameOf(entry.agent)}</p>
                <p className={entry.final ? "" : "at-caret"} style={{ fontFamily: SERIF, fontSize: 31, lineHeight: 1.28, color: INK }}>
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
