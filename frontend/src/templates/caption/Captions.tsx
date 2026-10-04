"use client";

import { useEffect, useRef } from "react";

import type { Language } from "@/lib/events";
import type { AgentIdentity, ProductGroup, TranscriptEntry } from "@/lib/voice-agent";

import { Filmstrip } from "./Filmstrip";
import { BLACK, DISPLAY, GREY, HISTORY, MONO, NARROW, YELLOW } from "./styles";

const FADE = "linear-gradient(to bottom, transparent 0, #000 32%)";

/** The conversation as subtitles: the agent's latest line is giant, older lines shrink and fade upwards. */
export function Captions({
  transcript,
  groups,
  agents,
  language,
}: {
  transcript: TranscriptEntry[];
  groups: ProductGroup[];
  agents: AgentIdentity[];
  language: Language;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const last = transcript.at(-1)?.text;
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [transcript.length, last]);
  const latestAgent = transcript.findLastIndex((entry) => entry.kind === "agent");
  const agentOf = (id: string | null) => agents.find((a) => a.id === id);

  return (
    <div ref={scroller} className="cp-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", maskImage: FADE, WebkitMaskImage: FADE }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 28, minHeight: "100%", paddingTop: 240, paddingBottom: 12 }}>
        {transcript.map((entry, index) => {
          if (entry.kind === "products") {
            const group = groups.find((g) => g.id === entry.groupId);
            return group ? <Filmstrip key={entry.id} group={group} language={language} /> : null;
          }
          if (entry.kind === "handover") {
            const agent = agentOf(entry.agent);
            return (
              <div key={entry.id} className="cp-wipe" style={{ background: BLACK, color: "#fff", display: "flex", alignItems: "center", gap: 16, padding: "16px 24px" }}>
                <span style={{ width: 12, height: 12, borderRadius: 999, background: YELLOW }} />
                <span style={{ fontFamily: DISPLAY, fontVariationSettings: NARROW, fontWeight: 600, fontSize: 28 }}>{agent?.displayName ?? entry.text} joins</span>
                <span style={{ fontFamily: MONO, fontSize: 14, color: "#8C8C8C" }}>{agent?.roleLabel}</span>
              </div>
            );
          }
          if (entry.kind === "visitor") {
            return (
              <div key={entry.id} className="cp-rise" style={{ alignSelf: "flex-end", maxWidth: "75%", textAlign: "right" }}>
                <p style={{ fontFamily: MONO, fontSize: 13, color: GREY, marginBottom: 6 }}>You</p>
                <p className={entry.final ? "" : "cp-caret"} style={{ fontFamily: DISPLAY, fontStyle: "italic", fontSize: 32, lineHeight: 1.25, color: entry.final ? GREY : HISTORY }}>
                  {entry.text}
                </p>
              </div>
            );
          }
          const live = index === latestAgent;
          return (
            <div key={entry.id} className="cp-rise" style={{ maxWidth: "92%" }}>
              <p style={{ fontFamily: MONO, fontSize: 13, color: GREY, marginBottom: 8 }}>{agentOf(entry.agent)?.displayName}</p>
              <p
                className={entry.final ? "" : "cp-caret"}
                style={{
                  fontFamily: DISPLAY,
                  fontVariationSettings: NARROW,
                  fontWeight: live ? 600 : 500,
                  fontSize: live ? 60 : 30,
                  lineHeight: live ? 1.08 : 1.25,
                  letterSpacing: live ? "-0.015em" : 0,
                  color: live ? BLACK : HISTORY,
                  transition: "font-size 450ms ease, color 450ms ease",
                }}
              >
                {entry.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
