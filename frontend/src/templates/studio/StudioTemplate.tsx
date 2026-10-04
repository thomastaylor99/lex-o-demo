"use client";

import { labels } from "@/components/i18n";
import { useDemoAgent } from "@/templates/useDemoAgent";

import { Conversation } from "./Conversation";
import { PresenceHeader } from "./Presence";
import { cx, studioCopy } from "./shared";
import { Sidebar } from "./Sidebar";
import styles from "./studio.module.css";
import { TalkDock } from "./TalkDock";
import { TopBar } from "./TopBar";

/** Studio: a dark AI studio with frosted glass panels, a live waveform and one amber accent. */
export function StudioTemplate({ className }: { className?: string }) {
  const agent = useDemoAgent();
  const l = labels(agent.language);
  const c = studioCopy(agent.language);
  const parts = { agent, l, c };

  return (
    <div
      className={cx(styles.root, className)}
      data-activity={agent.status === "live" ? agent.activity : "idle"}
      lang={agent.language}
    >
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.ambient} aria-hidden="true" />
      <div className={styles.noise} aria-hidden="true" />
      <div className={styles.frame}>
        <TopBar {...parts} />
        <div className={styles.columns}>
          <main className={cx(styles.glass, styles.main)}>
            <PresenceHeader {...parts} />
            <Conversation {...parts} />
            <TalkDock {...parts} />
          </main>
          <Sidebar {...parts} />
        </div>
      </div>
    </div>
  );
}
