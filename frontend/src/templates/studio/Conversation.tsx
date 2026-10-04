import { useEffect, useMemo, useRef, type ReactNode } from "react";

import type { TranscriptEntry } from "@/lib/voice-agent";

import { Avatar } from "./Presence";
import { ProductShelf } from "./ProductShelf";
import { cx, type PartProps } from "./shared";
import styles from "./studio.module.css";
import { Waveform } from "./Waveform";

/** The transcript as chat bubbles, with handover dividers and product shelves where they appeared. */
export function Conversation({ agent, l, c }: PartProps) {
  const { transcript, productGroups, agents, basket, language, profile } = agent;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const stick = () => {
      scroller.scrollTop = scroller.scrollHeight;
    };
    stick();
    // The dock and presence bar change height with the agent's activity, which shrinks the scroller after the last update.
    const observer = new ResizeObserver(stick);
    observer.observe(scroller);
    if (scroller.firstElementChild) observer.observe(scroller.firstElementChild);
    return () => observer.disconnect();
  }, [transcript, productGroups]);

  const basketIds = useMemo(() => new Set(basket.items.map((item) => item.product_id)), [basket.items]);
  const visitorName = profile?.first_name || l.you;
  const agentName = (id: string | null): string => agents.find((a) => a.id === id)?.displayName ?? l.advisor;
  const agentRole = (id: string | null): string | null => agents.find((a) => a.id === id)?.roleLabel ?? null;

  const renderEntry = (entry: TranscriptEntry, previous: TranscriptEntry | undefined): ReactNode => {
    switch (entry.kind) {
      case "agent": {
        const name = agentName(entry.agent);
        const continued = previous?.kind === "agent" && previous.agent === entry.agent;
        return (
          <li key={entry.id} className={cx(styles.row, styles.popIn)} data-continued={continued}>
            <span className={styles.avatarSlot}>{continued ? null : <Avatar name={name} size="sm" />}</span>
            <div className={styles.agentCol}>
              {continued ? null : <span className={styles.speaker}>{name}</span>}
              <p className={cx(styles.bubble, styles.bubbleAgent)}>
                {entry.text ? entry.text : <Waveform mode="thinking" bars={7} className={styles.waveInline} />}
                {entry.final || !entry.text ? null : <span className={styles.caret} aria-hidden="true" />}
              </p>
            </div>
          </li>
        );
      }
      case "visitor": {
        const continued = previous?.kind === "visitor";
        const live = !entry.final;
        return (
          <li key={entry.id} className={cx(styles.rowVisitor, styles.popInRight)} data-continued={continued}>
            {continued ? null : <span className={styles.speaker}>{visitorName}</span>}
            <div className={styles.bubbleVisitorWrap}>
              {live ? (
                <span className={cx(styles.mono, styles.liveTag)}>
                  <span className={styles.liveDot} aria-hidden="true" />
                  {c.transcribing}
                </span>
              ) : null}
              <p className={cx(styles.bubble, styles.bubbleVisitor)} data-live={live}>
                {entry.text ? entry.text : <Waveform mode="speaking" bars={7} className={styles.waveInline} />}
                {live && entry.text ? <span className={styles.caret} aria-hidden="true" /> : null}
              </p>
            </div>
          </li>
        );
      }
      case "handover": {
        const name = agents.find((a) => a.id === entry.agent)?.displayName ?? entry.text;
        const role = agentRole(entry.agent);
        return (
          <li key={entry.id} className={styles.handover}>
            <span className={styles.handLine} aria-hidden="true" />
            <span className={styles.handBadge}>
              <Avatar name={name} size="xs" />
              <span>
                {name} {l.joins}
              </span>
              {role ? <span className={cx(styles.mono, styles.handMeta)}>{role}</span> : null}
            </span>
            <span className={cx(styles.handLine, styles.handLineEnd)} aria-hidden="true" />
          </li>
        );
      }
      case "products": {
        const group = productGroups.find((g) => g.id === entry.groupId);
        if (!group || group.products.length === 0) return null;
        return (
          <li key={entry.id} className={styles.row}>
            <span className={styles.avatarSlot} aria-hidden="true" />
            <ProductShelf group={group} basketIds={basketIds} language={language} l={l} c={c} />
          </li>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div ref={scrollRef} className={styles.scroller}>
      {transcript.length === 0 ? (
        <div className={styles.empty}>
          <Waveform mode={agent.status === "starting" ? "thinking" : "idle"} bars={18} />
          <p className={styles.emptyTitle}>{c.emptyTitle}</p>
          <p className={styles.emptyBody}>{c.emptyBody}</p>
        </div>
      ) : (
        <ol className={styles.log} role="log" aria-live="polite">
          {transcript.map((entry, index) => renderEntry(entry, index > 0 ? transcript[index - 1] : undefined))}
        </ol>
      )}
    </div>
  );
}
