import { BODY, gold, INK, u } from "./theme";

const GOLD_FILL = "linear-gradient(180deg, #FBE7B4 0%, #EBC478 44%, #C9954A 100%)";

const GOLD_SHADOW = [
  "inset 0 1px 0 rgba(255, 249, 230, 0.9)",
  "inset 0 -3px 8px rgba(120, 78, 20, 0.35)",
  `0 0 0 1px ${gold(0.65)}`,
  `0 14px 40px ${gold(0.35)}`,
].join(", ");

/** The halo around the pill, larger than it, pulsing slowly at rest and quickly while connecting. */
const GLOW = `radial-gradient(closest-side, ${gold(0.5)}, ${gold(0.16)} 60%, transparent 100%)`;

/** A soft band of light that crosses the pill now and then, to draw the eye. */
const SHEEN = `linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.55), transparent)`;

/**
 * Begin as a glowing gold pill, inside the eclipse under the headline. It keeps one width for
 * Begin, Connecting and Try again, so nothing moves when the label changes.
 */
export function BeginButton({ label, starting, onBegin }: { label: string; starting: boolean; onBegin: () => void }) {
  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <span
        aria-hidden
        className="ec-pulse"
        style={{
          position: "absolute",
          inset: `calc(-1 * ${u(28)}) calc(-1 * ${u(44)})`,
          borderRadius: 999,
          background: GLOW,
          pointerEvents: "none",
        }}
      />
      <button
        type="button"
        onClick={onBegin}
        disabled={starting}
        aria-busy={starting}
        className="ec-press"
        style={{
          position: "relative",
          overflow: "hidden",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: u(300),
          height: u(80),
          padding: `0 ${u(56)}`,
          border: "none",
          borderRadius: 999,
          background: GOLD_FILL,
          boxShadow: GOLD_SHADOW,
          color: INK,
          fontFamily: BODY,
          fontSize: u(27),
          fontWeight: 600,
          letterSpacing: "0.01em",
          whiteSpace: "nowrap",
          cursor: starting ? "progress" : "pointer",
        }}
      >
        <span
          aria-hidden
          className="ec-sheen"
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: "38%",
            background: SHEEN,
            transform: "translateX(-140%) skewX(-18deg)",
          }}
        />
        <span className="ec-label" style={{ position: "relative" }}>
          {label}
        </span>
      </button>
    </div>
  );
}
