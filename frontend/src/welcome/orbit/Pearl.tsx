const YELLOW = "#FFD23F";

/** The voice as a luminous pearl with a yellow core: it breathes at rest and pulses while connecting. */
export function Pearl({ starting }: { starting: boolean }) {
  const period = starting ? 1 : 4.2;
  return (
    <span aria-hidden style={{ position: "relative", display: "grid", placeItems: "center", width: 132, height: 132 }}>
      {[0, 1].map((ring) => (
        <span
          key={ring}
          className="ob-motion"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 999,
            border: `1.5px solid ${YELLOW}`,
            animation: `ob-ring ${period * 1.4}s ease-out ${ring * period * 0.7}s infinite`,
          }}
        />
      ))}
      <span
        className="ob-motion"
        style={{
          width: 96,
          height: 96,
          borderRadius: 999,
          background: `radial-gradient(circle at 38% 32%, #FFFFFF 0%, #FFF4CC 28%, ${YELLOW} 62%, #F2B705 100%)`,
          boxShadow: "0 0 60px rgba(255, 210, 63, 0.55), 0 18px 40px rgba(242, 183, 5, 0.25)",
          animation: `ob-breathe ${period}s ease-in-out infinite`,
        }}
      />
    </span>
  );
}
