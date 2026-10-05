/**
 * The voice as one fine black line: a soft wave that breathes slowly at rest and quickens while
 * the session connects. Five strands, phase-shifted, read as a single living line.
 */
export function VoiceLine({ starting }: { starting: boolean }) {
  const period = starting ? 0.9 : 3.6;
  const strands = [0, 0.15, 0.3, 0.45, 0.6];
  return (
    <svg className="ma-wave" width={440} height={44} viewBox="0 0 440 44" aria-hidden style={{ overflow: "visible" }}>
      {strands.map((delay, index) => (
        <path
          key={delay}
          d="M0 22 C 55 22, 70 4, 110 4 S 165 40, 220 40 S 275 4, 330 4 S 385 22, 440 22"
          fill="none"
          stroke="#0A0A0A"
          strokeWidth={index === 2 ? 1.4 : 0.6}
          strokeOpacity={index === 2 ? 1 : 0.35}
          style={{
            transformOrigin: "220px 22px",
            animation: `ma-breathe ${period}s ease-in-out ${delay * period}s infinite`,
          }}
        />
      ))}
    </svg>
  );
}
