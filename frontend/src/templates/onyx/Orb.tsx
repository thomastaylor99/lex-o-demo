import type { AgentActivity } from "@/lib/voice-agent";

import { YELLOW, YELLOW_GLOW } from "./styles";

const CORE_MOTION: Record<AgentActivity, string | undefined> = {
  idle: undefined,
  listening: "ox-breathe 2.8s ease-in-out infinite",
  thinking: "ox-breathe 1.8s ease-in-out infinite",
  speaking: "ox-swell 1.15s ease-in-out infinite",
};

const ring = { position: "absolute", inset: 0, borderRadius: 999 } as const;

/**
 * The voice: a glowing yellow orb. It swells while speaking, ripples outward while listening,
 * a thin arc turns around it while thinking, and it dims when idle. Remounting it (keyed on the
 * active agent) plays the one-off handover pulse.
 */
export function Orb({ activity, size = 128 }: { activity: AgentActivity; size?: number }) {
  const idle = activity === "idle";
  return (
    <span style={{ position: "relative", width: size, height: size, flex: "none", animation: "ox-pulse 900ms cubic-bezier(0.2, 0.7, 0.1, 1) both" }} aria-hidden>
      <span
        style={{
          ...ring,
          inset: "-45%",
          background: `radial-gradient(circle, ${YELLOW_GLOW} 0%, rgba(255, 200, 61, 0.1) 40%, transparent 68%)`,
          opacity: idle ? 0.15 : 1,
          animation: activity === "speaking" ? "ox-glow 1.15s ease-in-out infinite" : undefined,
          transition: "opacity 600ms",
        }}
      />
      <span style={{ ...ring, border: `2px solid ${YELLOW}`, animation: "ox-burst 1100ms ease-out both" }} />
      {activity === "listening" &&
        [0, 1, 2].map((i) => (
          <span key={i} style={{ ...ring, border: `2px solid ${YELLOW}`, opacity: 0, animation: `ox-ripple 2.4s ${i * 0.8}s ease-out infinite` }} />
        ))}
      {activity === "thinking" && (
        <span
          style={{
            ...ring,
            inset: -16,
            border: "3px solid transparent",
            borderTopColor: YELLOW,
            borderRightColor: "rgba(255, 200, 61, 0.35)",
            animation: "ox-spin 1s linear infinite",
          }}
        />
      )}
      <span
        style={{
          ...ring,
          background: "radial-gradient(circle at 36% 30%, #FFF4CC 0%, #FFD866 26%, #FFC83D 52%, #D99A00 100%)",
          boxShadow: idle ? "none" : "0 0 60px 10px rgba(255, 200, 61, 0.35)",
          opacity: idle ? 0.38 : activity === "thinking" ? 0.85 : 1,
          filter: idle ? "saturate(0.55)" : "none",
          animation: CORE_MOTION[activity],
          transition: "opacity 600ms, box-shadow 600ms, filter 600ms",
        }}
      />
    </span>
  );
}
