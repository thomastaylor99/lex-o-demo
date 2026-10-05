"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { labels } from "@/components/i18n";
import type { AgentIdentity } from "@/lib/voice-agent";
import { ProductCarousel } from "@/skins/frost/ProductCarousel";
import type { SkinProps } from "@/skins/types";

import { InlineVoiceAgentLine } from "./AgentLine";
import { InlineVoiceHandover } from "./Handover";
import { liveLines } from "./live";
import { InlineVoiceVisitorLine } from "./VisitorLine";

const FADE = "linear-gradient(to bottom, transparent 0, #000 64px)";
/** Side gutter inside the scroller, so carousel shadows are not clipped. The negative margin cancels it. */
const GUTTER = 28;

/**
 * The conversation, oldest at the top, pinned to the latest line, with the voice on its lines: the
 * label of the line being spoken carries the wave, a label waits at the bottom while the agent's next
 * line is on its way, a bubble while the microphone listens. Keys follow positions (the transcript
 * only grows), so a waiting line and the line that arrives in its place stay one element.
 */
export function InlineVoiceTranscript({ agent }: SkinProps) {
  const { transcript, productGroups: groups, agents, activeAgent, language } = agent;
  const activity = agent.status === "live" ? agent.activity : "idle";
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

  const identity = (id: string | null): AgentIdentity | null => agents.find((a) => a.id === id) ?? null;
  const live = liveLines(transcript, activity);
  const next = transcript.length;

  const lines: ReactNode[] = transcript.map((entry, index) => {
    const key = `${entry.kind}-${index}`;
    if (entry.kind === "products") {
      const group = groups.find((g) => g.id === entry.groupId);
      return group ? <ProductCarousel key={key} group={group} language={language} /> : null;
    }
    if (entry.kind === "handover") {
      const to = identity(entry.agent);
      const before = transcript.slice(0, index).findLast((e) => e.kind === "agent" && e.agent !== entry.agent);
      return <InlineVoiceHandover key={key} from={identity(before?.agent ?? null)} to={to} name={to?.displayName ?? entry.text} language={language} />;
    }
    if (entry.kind === "visitor") {
      return <InlineVoiceVisitorLine key={key} text={entry.text} final={entry.final} listening={index === live.visitorLine} language={language} />;
    }
    const previous = transcript[index - 1];
    const continued = previous?.kind === "agent" && previous.agent === entry.agent;
    const name = continued ? null : (identity(entry.agent)?.displayName ?? l.advisor);
    return <InlineVoiceAgentLine key={key} text={entry.text} name={name} live={index === live.agentRun ? live.agentMode : null} language={language} />;
  });

  // In the same array as the lines, so the line that arrives at this position takes the element over.
  if (live.agentMode && live.agentRun < 0) {
    const name = activeAgent?.displayName ?? l.advisor;
    lines.push(<InlineVoiceAgentLine key={`agent-${next}`} text={null} name={name} live={live.agentMode} language={language} />);
  }
  if (live.visitorWaiting) {
    lines.push(<InlineVoiceVisitorLine key={`visitor-${next}`} text={null} final={false} listening language={language} />);
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
