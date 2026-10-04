import { AMBER, ON_DARK, ON_DARK_FAINT, ON_DARK_MUTED } from "./styles";

/**
 * One field of the customer record. Keyed by its value, the row remounts when the value changes,
 * so a newly captured field plays the amber pulse once.
 */
export function RecordRow({ label, value }: { label: string; value: string | null }) {
  const captured = value !== null;
  return (
    <div
      key={value ?? "empty"}
      className={captured ? "du-fill" : undefined}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 12px", margin: "0 -12px", borderRadius: 12 }}
    >
      <span
        style={{
          flex: "none",
          width: 9,
          height: 9,
          borderRadius: 999,
          background: captured ? AMBER : "transparent",
          boxShadow: captured ? "0 0 10px rgba(255, 154, 60, 0.65)" : `inset 0 0 0 1.5px ${ON_DARK_FAINT}`,
        }}
      />
      <span style={{ flex: "none", width: 108, fontSize: 15, fontWeight: 600, color: ON_DARK_MUTED }}>{label}</span>
      <span style={{ flex: 1, minWidth: 0, textAlign: "right", fontSize: captured ? 16 : 15, fontWeight: captured ? 700 : 500, lineHeight: 1.3, color: captured ? ON_DARK : ON_DARK_FAINT }}>
        {value ?? "Not captured yet"}
      </span>
    </div>
  );
}
