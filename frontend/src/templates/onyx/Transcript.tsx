"use client";

import { useEffect, useRef } from "react";

import type { Language } from "@/lib/events";
import type { AgentIdentity, ProductGroup, TranscriptEntry } from "@/lib/voice-agent";

import { AgentLine, HandoverChip, VisitorLine } from "./Lines";
import { ProductCarousel } from "./ProductCarousel";

const FADE = "linear-gradient(to bottom, transparent 0, #000 80px)";

/** True when this agent line follows another agent's line (or none): the speaker's name is then shown. */
function speakerChanged(transcript: TranscriptEntry[], index: number): boolean {
  const entry = transcript[index];
  const previous = transcript.slice(0, index).findLast((e) => e.kind === "agent");
  return previous?.agent !== entry.agent;
}

/** The conversation, oldest first, pinned to the newest line. */
export function Transcript(props: { transcript: TranscriptEntry[]; groups: ProductGroup[]; agents: AgentIdentity[]; language: Language }) {
  const { transcript, groups, agents, language } = props;
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript]);

  useEffect(() => {
    const el = scroller.current;
    const inner = content.current;
    if (!el || !inner) return;
    const observer = new ResizeObserver(() => {
      el.scrollTop = el.scrollHeight;
    });
    observer.observe(el);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  const nameOf = (id: string | null) => agents.find((a) => a.id === id)?.displayName ?? "";

  return (
    <div
      ref={scroller}
      className="ox-scroll"
      style={{ height: "100%", minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: "0 24px", margin: "0 -24px", maskImage: FADE, WebkitMaskImage: FADE }}
    >
      <div ref={content} style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 28, minHeight: "100%", padding: "80px 0 16px" }}>
        {transcript.map((entry, index) => {
          if (entry.kind === "products") {
            const group = groups.find((g) => g.id === entry.groupId);
            return group ? <ProductCarousel key={entry.id} group={group} language={language} /> : null;
          }
          if (entry.kind === "handover") return <HandoverChip key={entry.id} name={nameOf(entry.agent) || entry.text} />;
          if (entry.kind === "visitor") return <VisitorLine key={entry.id} text={entry.text} final={entry.final} />;
          const name = speakerChanged(transcript, index) ? nameOf(entry.agent) || null : null;
          return <AgentLine key={entry.id} text={entry.text} final={entry.final} name={name} />;
        })}
      </div>
    </div>
  );
}
