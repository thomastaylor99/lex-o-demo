"use client";

import { useEffect, useRef } from "react";

import type { Language } from "@/lib/events";
import type { AgentIdentity, ProductGroup, TranscriptEntry } from "@/lib/voice-agent";

import { AgentLine, HandoverChip, VisitorLine } from "./Entries";
import { ProductCarousel } from "./ProductCarousel";

const FADE = "linear-gradient(to bottom, transparent 0, #000 72px)";
/** Side gutter inside the scroller, so carousel shadows are not clipped. The negative margin cancels it. */
const GUTTER = 28;

/** The conversation, oldest at the top, pinned to the latest line. */
export function Transcript(props: {
  transcript: TranscriptEntry[];
  groups: ProductGroup[];
  agents: AgentIdentity[];
  language: Language;
}) {
  const { transcript, groups, agents, language } = props;
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript]);

  // The presence, camera and talk bar change the scroller's height; images change the content's.
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
      className="fr-scroll"
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        overflowX: "hidden",
        overflowY: "auto",
        margin: `0 -${GUTTER}px`,
        padding: `0 ${GUTTER}px`,
        maskImage: FADE,
        WebkitMaskImage: FADE,
      }}
    >
      <div ref={content} style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 24, minHeight: "100%", padding: "56px 0 16px" }}>
        {transcript.map((entry, index) => {
          if (entry.kind === "products") {
            const group = groups.find((g) => g.id === entry.groupId);
            return group ? <ProductCarousel key={entry.id} group={group} language={language} /> : null;
          }
          if (entry.kind === "handover") return <HandoverChip key={entry.id} name={nameOf(entry.agent) || entry.text} />;
          if (entry.kind === "visitor") return <VisitorLine key={entry.id} entry={entry} />;
          const previous = transcript[index - 1];
          const continued = previous?.kind === "agent" && previous.agent === entry.agent;
          return <AgentLine key={entry.id} entry={entry} label={continued ? null : nameOf(entry.agent)} />;
        })}
      </div>
    </div>
  );
}
