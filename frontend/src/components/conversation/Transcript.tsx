"use client";

import { useEffect, useRef } from "react";

import type { AgentIdentity, TranscriptEntry } from "@/lib/voice-agent";
import type { Labels } from "@/components/i18n";

/** The conversation as an editorial interview: the visitor in the sans, the advisor in the serif. */
export function Transcript({
  entries,
  agents,
  t,
}: {
  entries: TranscriptEntry[];
  agents: AgentIdentity[];
  t: Labels;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const lastText = entries.at(-1)?.text;

  // Jump to the latest line: smooth scrolling trails behind text that streams word by word.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries.length, lastText]);

  const nameOf = (id: string | null) => agents.find((a) => a.id === id)?.displayName ?? "";

  return (
    <div className="relative min-h-0 flex-1">
      {/* fade the oldest lines into the paper */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-paper to-transparent" />
      <div ref={scroller} className="h-full overflow-y-auto pr-6 [scrollbar-width:none]">
        <div className="flex min-h-full flex-col justify-end gap-9 pb-2 pt-16">
          {entries.map((entry) => {
            if (entry.kind === "products") return null;
            if (entry.kind === "handover") {
              return (
                <div key={entry.id} className="animate-fade flex items-center gap-5 py-1">
                  <span className="h-px flex-1 bg-hairline" />
                  <span className="font-display text-[19px] italic text-taupe">
                    {nameOf(entry.agent) || entry.text} {t.joins}
                  </span>
                  <span className="h-px flex-1 bg-hairline" />
                </div>
              );
            }
            if (entry.kind === "visitor") {
              return (
                <div key={entry.id} className="animate-fade max-w-[85%] self-end text-right">
                  <p className="mb-2 text-[13px] tracking-[0.16em] text-taupe">{t.you}</p>
                  <p
                    className={`text-[25px] font-light leading-snug transition-colors duration-500 ${
                      entry.final ? "text-ink-soft" : "caret text-mist"
                    }`}
                  >
                    {entry.text}
                  </p>
                </div>
              );
            }
            return (
              <div key={entry.id} className="animate-fade max-w-[92%]">
                <p className="mb-2 text-[13px] tracking-[0.16em] text-taupe">{nameOf(entry.agent)}</p>
                <p
                  className={`font-display text-[30px] leading-[1.32] text-ink ${
                    entry.final ? "" : "caret"
                  }`}
                >
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
