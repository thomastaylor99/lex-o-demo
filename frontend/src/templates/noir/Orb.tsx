import type { AgentActivity } from "@/lib/voice-agent";

import { CHAMPAGNE } from "./styles";

const MOTION: Record<AgentActivity, string | undefined> = {
  idle: undefined,
  listening: "nr-breathe 2.6s ease-in-out infinite",
  thinking: undefined,
  speaking: "nr-speak 1.1s ease-in-out infinite",
};

/** The voice as a glowing champagne orb: it swells while speaking, breathes while listening, and a thin ring turns while thinking. */
export function Orb({ activity, size = 64 }: { activity: AgentActivity; size?: number }) {
  return (
    <span style={{ position: "relative", width: size, height: size, flex: "none" }} aria-hidden>
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 999,
          background: `radial-gradient(circle at 35% 30%, #F6E7C8 0%, ${CHAMPAGNE} 45%, #7A6236 100%)`,
          boxShadow: "0 0 28px 6px rgba(201, 169, 110, 0.3)",
          opacity: activity === "idle" ? 0.45 : 1,
          animation: MOTION[activity],
          transition: "opacity 400ms",
        }}
      />
      {activity === "thinking" && (
        <span style={{ position: "absolute", inset: -8, borderRadius: 999, border: "1.5px solid transparent", borderTopColor: CHAMPAGNE, animation: "nr-spin 0.9s linear infinite" }} />
      )}
    </span>
  );
}
