import { WHITE, WHITE_38, WHITE_64, YELLOW } from "./styles";

/**
 * One field of the customer record. The parent keys it on its value, so it remounts and lights up
 * briefly when the field gets filled or changes.
 */
export function RecordRow({ label, value }: { label: string; value: string | null }) {
  const captured = value !== null;
  return (
    <div className={captured ? "ox-lit" : undefined} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", margin: "0 -12px", borderRadius: 14 }}>
      <span
        aria-hidden
        style={{
          width: 9,
          height: 9,
          flex: "none",
          borderRadius: 999,
          background: captured ? YELLOW : "transparent",
          boxShadow: captured ? "0 0 10px rgba(255, 200, 61, 0.6)" : `inset 0 0 0 1.5px ${WHITE_38}`,
        }}
      />
      <span style={{ flex: "none", fontSize: 17, color: WHITE_64 }}>{label}</span>
      <span
        className={captured ? "ox-lit-text" : undefined}
        style={{
          marginLeft: "auto",
          textAlign: "right",
          fontSize: captured ? 18 : 16,
          fontWeight: captured ? 600 : 400,
          lineHeight: 1.3,
          color: captured ? WHITE : WHITE_38,
        }}
      >
        {value ?? "Not captured yet"}
      </span>
    </div>
  );
}
