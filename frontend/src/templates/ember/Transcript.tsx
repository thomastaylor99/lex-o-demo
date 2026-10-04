"use client";

import { useEffect, useRef } from "react";

import type { Language } from "@/lib/events";
import type { AgentIdentity, ProductGroup, TranscriptEntry } from "@/lib/voice-agent";

import { AgentLine, HandoverPill, VisitorLine } from "./Lines";
import { ProductCarousel } from "./ProductCarousel";

const FADE = "linear-gradient(to bottom, transparent 0, #000 64px)";

/** The conversation, newest at the bottom, pinned there while lines stream and panels resize. */
export function Transcript({
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

  const nameOf = (id: string | null) => agents.find((agent) => agent.id === id)?.displayName ?? "";

  return (
    <div
      ref={scroller}
      className="em-scroll"
      style={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: "auto", maskImage: FADE, WebkitMaskImage: FADE }}
    >
      <div
        ref={content}
        style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 18, minHeight: "100%", padding: "48px 2px 6px" }}
      >
        {transcript.map((entry) => {
          if (entry.kind === "products") {
            const group = groups.find((g) => g.id === entry.groupId);
            return group ? <ProductCarousel key={entry.id} group={group} language={language} /> : null;
          }
          if (entry.kind === "handover") {
            return <HandoverPill key={entry.id} name={nameOf(entry.agent) || entry.text} />;
          }
          if (entry.kind === "visitor") {
            return <VisitorLine key={entry.id} text={entry.text} live={!entry.final} />;
          }
          return <AgentLine key={entry.id} name={nameOf(entry.agent)} text={entry.text} live={!entry.final} />;
        })}
      </div>
    </div>
  );
}
