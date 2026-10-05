import { BODY, gold, GOLD_LIGHT, TEXT, u } from "../theme";
import { SHEEN } from "./shared";

type ButtonProps = { label: string; starting: boolean; onBegin: () => void };

const BASE = {
  position: "relative",
  overflow: "hidden",
  minWidth: u(260),
  padding: `${u(18)} ${u(50)}`,
  borderRadius: 999,
  fontFamily: BODY,
  fontSize: u(20),
  fontWeight: 500,
  letterSpacing: "0.06em",
} as const;

/** Couture: a fine gold outline, a faint gold wash inside, and a sheen now and then. */
export function HairlineButton({ label, starting, onBegin }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onBegin}
      disabled={starting}
      aria-busy={starting}
      className="ec-press"
      style={{
        ...BASE,
        border: `1px solid ${gold(0.9)}`,
        background: `linear-gradient(180deg, ${gold(0.12)}, ${gold(0.02)})`,
        color: GOLD_LIGHT,
        cursor: starting ? "progress" : "pointer",
        boxShadow: `0 0 34px ${gold(0.16)}, inset 0 0 18px ${gold(0.08)}`,
      }}
    >
      <span aria-hidden className="ec-sheen" style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "40%", background: SHEEN }} />
      <span className="ec-label" style={{ position: "relative" }}>{label}</span>
    </button>
  );
}

/** Liquid gold: frosted glass edged in pale gold, with a small gold point before the label. */
export function GlassButton({ label, starting, onBegin }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onBegin}
      disabled={starting}
      aria-busy={starting}
      className="ec-press"
      style={{
        ...BASE,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: u(14),
        border: "1px solid rgba(251, 232, 188, 0.55)",
        background: "rgba(255, 255, 255, 0.07)",
        backdropFilter: "blur(16px) saturate(140%)",
        WebkitBackdropFilter: "blur(16px) saturate(140%)",
        color: TEXT,
        cursor: starting ? "progress" : "pointer",
        boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 12px 40px rgba(0, 0, 0, 0.55), 0 0 40px ${gold(0.18)}`,
      }}
    >
      <span aria-hidden className="ec-sheen" style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "40%", background: SHEEN }} />
      <span aria-hidden className="ec-pulse" style={{ position: "relative", width: u(10), height: u(10), borderRadius: 999, background: GOLD_LIGHT, boxShadow: `0 0 14px ${gold(0.9)}` }} />
      <span className="ec-label" style={{ position: "relative" }}>{label}</span>
    </button>
  );
}
