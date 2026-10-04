import type { AgentIdentity } from "@/lib/voice-agent";

import { cx, initial, waveModeFor, type PartProps, type WaveMode } from "./shared";
import styles from "./studio.module.css";
import { Waveform } from "./Waveform";

interface AvatarProps {
  name: string;
  size: "xs" | "sm" | "lg";
  mode?: WaveMode;
}

export function Avatar({ name, size, mode }: AvatarProps) {
  return (
    <span className={styles.avatar} data-size={size} aria-hidden="true">
      {mode ? <span className={styles.avatarRing} data-mode={mode} /> : null}
      <span className={styles.avatarFace}>{initial(name)}</span>
    </span>
  );
}

function AgentRoster({ agents, activeId }: { agents: AgentIdentity[]; activeId: string | null }) {
  if (agents.length < 2) return null;
  return (
    <ol className={styles.roster} aria-label="Agents">
      {agents.map((agent, index) => (
        <li key={agent.id} className={styles.rosterItem} data-active={agent.id === activeId}>
          {index > 0 ? <span className={styles.rosterLink} aria-hidden="true" /> : null}
          <span className={styles.rosterNode} title={agent.displayName}>
            {initial(agent.displayName)}
          </span>
          <span className={cx(styles.mono, styles.rosterLabel)}>{agent.roleLabel}</span>
        </li>
      ))}
    </ol>
  );
}

/** The active agent: avatar, name, live waveform and what it is doing right now. */
export function PresenceHeader({ agent, l, c }: PartProps) {
  const { activeAgent, agents, activity, status } = agent;
  const mode = waveModeFor(status, activity);
  const name = activeAgent?.displayName ?? l.advisor;
  const label =
    status === "starting" ? c.connecting : status === "error" ? c.error : status === "live" ? l.activity[activity] : c.ready;

  return (
    <header className={styles.presence}>
      <div key={activeAgent?.id ?? "none"} className={styles.presenceWho}>
        <Avatar name={name} size="lg" mode={mode} />
        <div className="min-w-0">
          <h1 className={styles.agentName}>{name}</h1>
          {activeAgent ? <p className={cx(styles.mono, styles.agentRole)}>{activeAgent.roleLabel}</p> : null}
        </div>
      </div>
      <div className={styles.voice}>
        <Waveform mode={mode} bars={30} className={styles.waveMain} />
        <span className={cx(styles.mono, styles.activityLabel)} data-mode={mode} aria-live="polite">
          {label}
        </span>
      </div>
      <AgentRoster agents={agents} activeId={activeAgent?.id ?? null} />
    </header>
  );
}
