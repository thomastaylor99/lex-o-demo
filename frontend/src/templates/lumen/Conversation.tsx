"use client";

import { useEffect, useRef } from "react";

import type { Language } from "@/lib/events";
import type { AgentIdentity, ProductGroup, TranscriptEntry } from "@/lib/voice-agent";

import { AgentLine, HandoverPill, VisitorLine } from "./Message";
import { ProductCarousel } from "./ProductCarousel";

const FADE = "linear-gradient(to bottom, transparent 0, #000 72px)";

/** The transcript in order, with the handover pill and inline carousels where they happened. */
export function Conversation(props: {
  transcript: TranscriptEntry[];
  groups: ProductGroup[];
  agents: AgentIdentity[];
  basketIds: Set<string>;
  language: Language;
  visitorLabel: string;
}) {
  const { transcript, groups, agents, basketIds, language, visitorLabel } = props;
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const stick = () => {
      element.scrollTop = element.scrollHeight;
    };
    stick();
    // Presence, talk bar and camera change height with activity; keep the latest line in view.
    const observer = new ResizeObserver(stick);
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    return () => observer.disconnect();
  }, [transcript, groups]);

  const nameOf = (id: string | null) => agents.find((agent) => agent.id === id)?.displayName ?? "Beauty advisor";

  return (
    <div
      ref={scroller}
      className="lm-scroll"
      style={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: "auto", padding: "12px 10px 16px 4px", maskImage: FADE, WebkitMaskImage: FADE }}
    >
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 20, minHeight: "100%" }}>
        {transcript.map((entry, index) => {
          if (entry.kind === "products") {
            const group = groups.find((g) => g.id === entry.groupId);
            if (!group || group.products.length === 0) return null;
            return <ProductCarousel key={entry.id} group={group} basketIds={basketIds} language={language} />;
          }
          if (entry.kind === "handover") {
            return <HandoverPill key={entry.id} name={agents.find((a) => a.id === entry.agent)?.displayName ?? entry.text} />;
          }
          if (entry.kind === "visitor") {
            return <VisitorLine key={entry.id} entry={entry} label={visitorLabel} />;
          }
          const previous = transcript[index - 1];
          const continued = previous?.kind === "agent" && previous.agent === entry.agent;
          return <AgentLine key={entry.id} entry={entry} name={nameOf(entry.agent)} continued={continued} />;
        })}
      </div>
    </div>
  );
}
