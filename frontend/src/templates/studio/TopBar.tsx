import { ReplayIcon } from "./icons";
import { cx, formatCost, formatStatSeconds, type PartProps } from "./shared";
import styles from "./studio.module.css";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className={cx(styles.pill, styles.mono)}>
      <span className={styles.pillLabel}>{label}</span>
      <span key={value} className={styles.flash}>
        {value}
      </span>
    </span>
  );
}

/** Wordmark, session status, reply-time and cost pills, and a discreet replay. */
export function TopBar({ agent, l, c }: PartProps) {
  const { status, replyStats, costEur, language, replay } = agent;
  const seconds = (ms: number | null): string => (ms === null ? "–" : formatStatSeconds(ms, language));
  const statusLabel =
    status === "live" ? c.live : status === "starting" ? c.connecting : status === "error" ? c.error : c.ready;

  return (
    <header className={styles.topbar}>
      <div className={styles.lockup}>
        <span className={styles.wordmark}>L’Oréal</span>
        <span className={styles.wordRule} aria-hidden="true" />
        <span className={styles.subtitle}>{l.advisor}</span>
      </div>
      <div className={styles.stats}>
        <span className={cx(styles.pill, styles.mono)}>
          <span className={styles.statusDot} data-status={status} aria-hidden="true" />
          {statusLabel}
        </span>
        <Stat label={c.avg} value={seconds(replyStats.averageMs)} />
        <Stat label={c.p90} value={seconds(replyStats.p90Ms)} />
        <Stat label={c.cost} value={formatCost(costEur, language)} />
        <button type="button" className={cx(styles.replay, styles.mono)} onClick={replay}>
          <ReplayIcon />
          {c.replay}
        </button>
      </div>
    </header>
  );
}
