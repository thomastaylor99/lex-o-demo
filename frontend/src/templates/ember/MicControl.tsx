import { AMBER, AMBER_LINE, AMBER_SOFT, FAINT, ON_AMBER } from "./theme";

function Mic() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

/** Hold to talk: the amber hold button. Hands-free: a quiet microphone that glows while it listens. */
export function MicControl({
  hold,
  pressed,
  listening,
  onPress,
  onRelease,
}: {
  hold: boolean;
  pressed: boolean;
  listening: boolean;
  onPress: () => void;
  onRelease: () => void;
}) {
  if (!hold) {
    return (
      <span
        aria-hidden
        style={{
          width: 60,
          height: 60,
          borderRadius: 999,
          display: "grid",
          placeItems: "center",
          background: listening ? AMBER_SOFT : "rgba(255, 255, 255, 0.06)",
          color: listening ? AMBER : FAINT,
          boxShadow: listening ? "0 0 32px rgba(255, 154, 60, 0.28)" : "none",
          transition: "all 400ms ease",
        }}
      >
        <Mic />
      </span>
    );
  }

  return (
    <button
      type="button"
      onPointerDown={onPress}
      onPointerUp={onRelease}
      onPointerLeave={onRelease}
      onPointerCancel={onRelease}
      className="em-press"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        height: 60,
        padding: "0 30px 0 24px",
        borderRadius: 999,
        fontSize: 18,
        fontWeight: 700,
        border: `1px solid ${AMBER_LINE}`,
        background: pressed ? AMBER : AMBER_SOFT,
        color: pressed ? ON_AMBER : AMBER,
        boxShadow: pressed ? "0 0 0 8px rgba(255, 154, 60, 0.16), 0 0 44px rgba(255, 154, 60, 0.45)" : "none",
        transform: pressed ? "scale(1.04)" : "none",
        touchAction: "none",
        userSelect: "none",
        cursor: "pointer",
      }}
    >
      <Mic />
      {pressed ? "Talking" : "Hold"}
    </button>
  );
}
