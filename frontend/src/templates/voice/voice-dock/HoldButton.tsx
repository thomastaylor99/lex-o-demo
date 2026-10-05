import { MicIcon } from "@/skins/frost/icons";
import { INK, YELLOW } from "@/skins/frost/theme";

/**
 * The hold button at the dock's right end: white at rest, yellow with a soft glow while held. It pops
 * in with hold to talk; the pop sits on a wrapper so its fill does not override the pressed scale.
 */
export function HoldButton(props: { pressed: boolean; disabled: boolean; label: string; press: () => void; release: () => void }) {
  const { pressed, disabled, label, press, release } = props;
  return (
    <span className="fr-pop" style={{ flex: "0 0 56px", display: "flex" }}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={pressed}
        disabled={disabled}
        onPointerDown={(event) => {
          event.preventDefault();
          press();
        }}
        onPointerUp={release}
        onPointerLeave={release}
        onPointerCancel={release}
        style={{
          width: 56,
          height: 56,
          display: "grid",
          placeItems: "center",
          borderRadius: 999,
          background: pressed ? YELLOW : "#fff",
          color: INK,
          boxShadow: pressed ? "0 0 0 6px rgba(255, 210, 63, 0.3)" : "none",
          transform: pressed ? "scale(1.06)" : "none",
          transition: "background-color 180ms, box-shadow 180ms, transform 180ms",
          cursor: "pointer",
          touchAction: "none",
        }}
      >
        <MicIcon size={22} />
      </button>
    </span>
  );
}
