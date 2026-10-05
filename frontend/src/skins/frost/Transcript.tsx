"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { labels } from "@/components/i18n";
import type { Language } from "@/lib/events";
import type { AgentActivity, AgentIdentity, ProductGroup, Recap, TranscriptEntry, TutorialGroup } from "@/lib/voice-agent";

import { AgentLine, VisitorLine } from "./Entries";
import { Handover } from "./Handover";
import { liveLines } from "./live";
import { ProductCarousel } from "./ProductCarousel";
import { RecapPreview } from "./RecapPreview";
import { Tutorials } from "./Tutorials";

const FADE = "linear-gradient(to bottom, transparent 0, #000 64px)";
/** Side gutter inside the scroller, so carousel shadows are not clipped. The negative margin cancels it. */
const GUTTER = 28;

/**
 * The conversation, oldest at the top, pinned to the latest line, with the voice on its lines: the
 * label of the line being spoken carries the wave, a label waits at the bottom while the agent's next
 * line is on its way, a bubble while the microphone listens. Products, tutorials and the recap show
 * where they appeared. Keys follow positions (the transcript only grows), so a waiting line and the
 * line that arrives in its place stay one element.
 */
export function Transcript(props: {
  transcript: TranscriptEntry[];
  groups: ProductGroup[];
  tutorialGroups: TutorialGroup[];
  recap: Recap | null;
  agents: AgentIdentity[];
  activeAgent: AgentIdentity | null;
  /** The agent's activity while the session is live, idle otherwise. */
  activity: AgentActivity;
  language: Language;
}) {
  const { transcript, groups, tutorialGroups, recap, agents, activeAgent, activity, language } = props;
  const l = labels(language);
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript]);

  // Waiting lines, the camera and the talk bar change the heights; so do images.
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

  const identity = (id: string | null) => agents.find((agent) => agent.id === id) ?? null;
  // The screen keeps the latest recap only, so it shows once: where it was last prepared.
  const recapEntryId = transcript.findLast((entry) => entry.kind === "recap")?.id;
  const live = liveLines(transcript, activity);
  const next = transcript.length;

  const lines: ReactNode[] = transcript.map((entry, index) => {
    const key = `${entry.kind}-${index}`;
    if (entry.kind === "products") {
      const group = groups.find((g) => g.id === entry.groupId);
      return group ? <ProductCarousel key={key} group={group} language={language} /> : null;
    }
    if (entry.kind === "tutorials") {
      const group = tutorialGroups.find((g) => g.id === entry.groupId);
      return group ? <Tutorials key={key} group={group} language={language} /> : null;
    }
    if (entry.kind === "recap") {
      return recap && entry.id === recapEntryId ? <RecapPreview key={key} recap={recap} language={language} /> : null;
    }
    if (entry.kind === "handover") {
      const to = identity(entry.agent);
      const before = transcript.slice(0, index).findLast((e) => e.kind === "agent" && e.agent !== entry.agent);
      return <Handover key={key} from={identity(before?.agent ?? null)} to={to} name={to?.displayName ?? entry.text} language={language} />;
    }
    if (entry.kind === "visitor") {
      return <VisitorLine key={key} text={entry.text} final={entry.final} listening={index === live.visitorLine} language={language} />;
    }
    const previous = transcript[index - 1];
    const continued = previous?.kind === "agent" && previous.agent === entry.agent;
    const name = continued ? null : (identity(entry.agent)?.displayName ?? l.advisor);
    return <AgentLine key={key} text={entry.text} name={name} live={index === live.agentRun ? live.agentMode : null} language={language} />;
  });

  // In the same array as the lines, so the line that arrives at this position takes the element over.
  if (live.agentMode && live.agentRun < 0) {
    const name = activeAgent?.displayName ?? l.advisor;
    lines.push(<AgentLine key={`agent-${next}`} text={null} name={name} live={live.agentMode} language={language} />);
  }
  if (live.visitorWaiting) {
    lines.push(<VisitorLine key={`visitor-${next}`} text={null} final={false} listening language={language} />);
  }

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
        {lines}
      </div>
    </div>
  );
}
