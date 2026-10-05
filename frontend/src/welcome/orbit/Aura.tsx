/** Orbit, halo: a large sunrise of yellow light behind the headline that breathes, faster while connecting. */
export function Aura({ starting }: { starting: boolean }) {
  return (
    <span
      aria-hidden
      className="ob-motion"
      style={{
        position: "absolute",
        left: "50%",
        top: "46%",
        width: 1180,
        height: 1180,
        borderRadius: 999,
        background:
          "radial-gradient(circle, rgba(255, 214, 90, 0.55) 0%, rgba(255, 226, 140, 0.32) 26%, rgba(255, 240, 200, 0.14) 48%, rgba(255, 255, 255, 0) 68%)",
        animation: `ob-bloom ${starting ? 1.6 : 7}s ease-in-out infinite`,
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
      }}
    />
  );
}

/** The voice above the headline in the halo variant: one small glowing point. */
export function Spark({ starting }: { starting: boolean }) {
  return (
    <span
      aria-hidden
      className="ob-motion"
      style={{
        display: "block",
        width: 22,
        height: 22,
        borderRadius: 999,
        background: "radial-gradient(circle at 38% 32%, #FFFFFF 0%, #FFE58A 45%, #FFD23F 100%)",
        boxShadow: "0 0 34px rgba(255, 210, 63, 0.9)",
        animation: `ob-breathe ${starting ? 1 : 3.6}s ease-in-out infinite`,
      }}
    />
  );
}
