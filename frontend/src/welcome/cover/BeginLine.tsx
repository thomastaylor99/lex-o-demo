import { ALERT, BODY, DISPLAY, FIELD, GOLD, GOLD_FILL, MUTED, u } from "./theme";

/**
 * The main cover line, set as the call to action: a gold pill with the microphone, the privacy
 * note beside it, and the reason a start failed above the note. The pill keeps its width across
 * Begin, Connecting and Try again.
 */
export function BeginLine({
  label,
  note,
  starting,
  failure,
  onBegin,
}: {
  label: string;
  note: string;
  starting: boolean;
  failure: string | null;
  onBegin: () => void;
}) {
  return (
    <div
      className="co-rise"
      style={{ marginTop: "auto", paddingTop: u(32), display: "flex", alignItems: "center", gap: u(40), animationDelay: "520ms" }}
    >
      <button
        type="button"
        disabled={starting}
        aria-busy={starting}
        onClick={onBegin}
        className="co-press"
        style={{
          flex: "none",
          width: u(392),
          height: u(96),
          display: "flex",
          alignItems: "center",
          gap: u(26),
          padding: `0 ${u(40)} 0 ${u(10)}`,
          border: "none",
          borderRadius: 999,
          background: GOLD_FILL,
          color: FIELD,
          fontFamily: DISPLAY,
          fontSize: u(46),
          fontStyle: "italic",
          fontWeight: 500,
          cursor: starting ? "progress" : "pointer",
          boxShadow: `0 ${u(18)} ${u(50)} rgba(221, 174, 98, 0.28)`,
        }}
      >
        <span
          aria-hidden
          style={{ flex: "none", width: u(76), height: u(76), display: "grid", placeItems: "center", borderRadius: 999, background: FIELD, color: GOLD }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" style={{ width: u(32), height: u(32) }}>
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
          </svg>
        </span>
        <span className={starting ? "co-breathe" : undefined} style={{ marginTop: u(-4) }}>
          {label}
        </span>
      </button>

      <div style={{ maxWidth: u(470), fontFamily: BODY }}>
        {failure !== null && (
          <p role="alert" style={{ margin: `0 0 ${u(8)}`, fontSize: u(25), lineHeight: 1.3, fontWeight: 500, color: ALERT }}>
            {failure}
          </p>
        )}
        <p style={{ margin: 0, fontSize: u(22), lineHeight: 1.45, color: MUTED }}>{note}</p>
      </div>
    </div>
  );
}
