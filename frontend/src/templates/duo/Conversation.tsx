"use client";

import { useEffect, useRef } from "react";

import type { Language } from "@/lib/events";
import type { AgentIdentity, ProductGroup, TranscriptEntry } from "@/lib/voice-agent";

import { AgentMessage } from "./AgentMessage";
import { HandoverPill } from "./HandoverPill";
import { ProductCarousel } from "./ProductCarousel";
import { VisitorMessage } from "./VisitorMessage";

const FADE = "linear-gradient(to bottom, transparent 0, #000 80px)";

/** The visitor's side of the story: the transcript in order, products inline, pinned to the latest line. */
export function Conversation({
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

  // Presence, talk bar and camera change the scroller's size; growing cards change the content's.
  useEffect(() => {
    const el = scroller.current;
    const inner = content.current;
    if (!el || !inner) return;
    const pin = () => {
      el.scrollTop = el.scrollHeight;
    };
    const observer = new ResizeObserver(pin);
    observer.observe(el);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  const nameOf = (id: string | null) => agents.find((agent) => agent.id === id)?.displayName ?? "";

  return (
    <div
      ref={scroller}
      className="du-scroll"
      style={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: "auto", padding: "0 20px", margin: "0 -20px", maskImage: FADE, WebkitMaskImage: FADE }}
    >
      <div ref={content} style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 22, minHeight: "100%", padding: "80px 0 28px" }}>
        {transcript.map((entry) => {
          switch (entry.kind) {
            case "products": {
              const group = groups.find((g) => g.id === entry.groupId);
              return group ? <ProductCarousel key={entry.id} group={group} language={language} /> : null;
            }
            case "handover":
              return <HandoverPill key={entry.id} name={nameOf(entry.agent) || entry.text} />;
            case "visitor":
              return <VisitorMessage key={entry.id} text={entry.text} final={entry.final} />;
            default:
              return <AgentMessage key={entry.id} role={nameOf(entry.agent)} text={entry.text} final={entry.final} />;
          }
        })}
      </div>
    </div>
  );
}
