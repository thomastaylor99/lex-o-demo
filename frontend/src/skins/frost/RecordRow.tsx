import { fs, INK, MUTED, QUIET, TRACK, YELLOW } from "./theme";

/**
 * One field of the customer record. When the field fills or changes, the row remounts: it flashes
 * yellow, the dot turns yellow and the value pops in. It is keyed on the raw value, so a switch of
 * language rewrites the words without a flash.
 */
export function RecordRow({ label, value, raw, empty }: { label: string; value: string | null; raw: string | null; empty: string }) {
  const captured = value !== null;

  return (
    <div
      key={raw ?? "empty"}
      className={captured ? "fr-flash" : undefined}
      style={{
        display: "grid",
        gridTemplateColumns: "8px auto minmax(0, 1fr)",
        alignItems: "center",
        columnGap: 10,
        margin: "0 -10px",
        borderRadius: 12,
        padding: "7px 10px",
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 999, background: captured ? YELLOW : TRACK }} />
      <span style={{ fontSize: fs(16), color: MUTED, whiteSpace: "nowrap" }}>{label}</span>
      <span
        className={captured ? "fr-pop" : undefined}
        style={{
          textAlign: "right",
          transformOrigin: "right center",
          fontSize: captured ? fs(17) : fs(15),
          fontWeight: captured ? 600 : 400,
          lineHeight: 1.3,
          color: captured ? INK : QUIET,
        }}
      >
        {value ?? empty}
      </span>
    </div>
  );
}
