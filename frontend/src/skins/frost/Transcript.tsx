"use client";

import { useEffect, useRef } from "react";

import { labels } from "@/components/i18n";
import type { Language } from "@/lib/events";
import type { AgentIdentity, ProductGroup, Recap, TranscriptEntry, TutorialGroup } from "@/lib/voice-agent";

import { AgentLine, HandoverChip, VisitorLine } from "./Entries";
import { ProductCarousel } from "./ProductCarousel";
import { RecapPreview } from "./RecapPreview";
import { Tutorials } from "./Tutorials";

const FADE = "linear-gradient(to bottom, transparent 0, #000 64px)";
/** Side gutter inside the scroller, so carousel shadows are not clipped. The negative margin cancels it. */
const GUTTER = 28;

/** The conversation, oldest at the top, pinned to the latest line. Products, tutorials and the recap show where they appeared. */
export function Transcript(props: {
  transcript: TranscriptEntry[];
  groups: ProductGroup[];
  tutorialGroups: TutorialGroup[];
  recap: Recap | null;
  agents: AgentIdentity[];
  language: Language;
}) {
  const { transcript, groups, tutorialGroups, recap, agents, language } = props;
  const l = labels(language);
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript]);

  // The capsule, camera and talk bar change the scroller's height; images change the content's.
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

  const nameOf = (id: string | null) => agents.find((agent) => agent.id === id)?.displayName;
  // The screen keeps the latest recap only, so it shows once: where it was last prepared.
  const recapEntryId = transcript.findLast((entry) => entry.kind === "recap")?.id;

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
      <div ref={content} style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 20, minHeight: "100%", padding: "48px 0 14px" }}>
        {transcript.map((entry, index) => {
          if (entry.kind === "products") {
            const group = groups.find((g) => g.id === entry.groupId);
            return group ? <ProductCarousel key={entry.id} group={group} language={language} /> : null;
          }
          if (entry.kind === "tutorials") {
            const group = tutorialGroups.find((g) => g.id === entry.groupId);
            return group ? <Tutorials key={entry.id} group={group} language={language} /> : null;
          }
          if (entry.kind === "recap") {
            return recap && entry.id === recapEntryId ? <RecapPreview key={entry.id} recap={recap} language={language} /> : null;
          }
          if (entry.kind === "handover") return <HandoverChip key={entry.id} text={`${nameOf(entry.agent) ?? entry.text} ${l.joined}`} />;
          if (entry.kind === "visitor") return <VisitorLine key={entry.id} entry={entry} />;
          const previous = transcript[index - 1];
          const continued = previous?.kind === "agent" && previous.agent === entry.agent;
          return <AgentLine key={entry.id} entry={entry} label={continued ? null : (nameOf(entry.agent) ?? l.advisor)} />;
        })}
      </div>
    </div>
  );
}
