import { INK, MUTED, QUIET, TRACK, YELLOW } from "./theme";

/**
 * One field of the customer record. When it gets captured the row remounts (keyed on the value):
 * it lights up in yellow, the dot turns yellow and the value pops in.
 */
export function RecordRow({ label, value }: { label: string; value: string | null }) {
  const captured = value !== null;

  return (
    <div
      key={value ?? "empty"}
      className={captured ? "fr-flash" : undefined}
      style={{
        display: "grid",
        gridTemplateColumns: "10px auto 1fr",
        alignItems: "center",
        columnGap: 12,
        margin: "0 -12px",
        borderRadius: 14,
        padding: "9px 12px",
      }}
    >
      <span style={{ width: 9, height: 9, borderRadius: 999, background: captured ? YELLOW : TRACK }} />
      <span style={{ fontSize: 16, color: MUTED, whiteSpace: "nowrap" }}>{label}</span>
      <span
        className={captured ? "fr-pop" : undefined}
        style={{
          textAlign: "right",
          transformOrigin: "right center",
          fontSize: captured ? 17 : 15,
          fontWeight: captured ? 600 : 400,
          lineHeight: 1.3,
          color: captured ? INK : QUIET,
        }}
      >
        {value ?? "Not captured yet"}
      </span>
    </div>
  );
}
