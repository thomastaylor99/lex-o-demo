import type { CSSProperties } from "react";

import type { AgentActivity } from "@/lib/voice-agent";

import { AMBER, AMBER_SOFT, ORB_FILL } from "./styles";

const RING_DELAYS = [0, 0.6, 1.2];
const fill: CSSProperties = { position: "absolute", borderRadius: 999 };

/**
 * The amber voice orb. Rings expand while speaking, the halo breathes while listening, an arc
 * turns while thinking. `flashKey` changes at a handover: the orb flashes once for the new agent.
 */
export function Orb({ activity, flashKey, size = 104 }: { activity: AgentActivity; flashKey: string | null; size?: number }) {
  const core = Math.round(size * 0.48);
  const listening = activity === "listening";
  const idle = activity === "idle";

  return (
    <span aria-hidden style={{ position: "relative", width: size, height: size, flex: "none", display: "grid", placeItems: "center" }}>
      {/* Soft concentric rings, always there; they breathe while listening. */}
      <span style={{ ...fill, inset: 0, animation: listening ? "du-breathe 3.2s ease-in-out infinite" : undefined }}>
        <span style={{ ...fill, inset: "4%", border: "1.5px solid rgba(255, 154, 60, 0.16)" }} />
        <span style={{ ...fill, inset: "17%", border: "1.5px solid rgba(255, 154, 60, 0.26)" }} />
      </span>

      {listening && <span style={{ ...fill, inset: "10%", background: AMBER_SOFT, animation: "du-halo 3.2s ease-in-out infinite" }} />}

      {activity === "speaking" &&
        RING_DELAYS.map((delay) => (
          <span
            key={delay}
            style={{ ...fill, inset: 0, border: "2px solid rgba(255, 154, 60, 0.6)", animation: `du-ring 1.8s ${delay}s ease-out infinite both` }}
          />
        ))}

      {activity === "thinking" && (
        <span
          style={{
            ...fill,
            inset: "13%",
            border: "3px solid rgba(255, 154, 60, 0.12)",
            borderTopColor: AMBER,
            borderRightColor: "rgba(255, 154, 60, 0.45)",
            animation: "du-spin 1.1s linear infinite",
          }}
        />
      )}

      {flashKey && (
        <span
          key={flashKey}
          style={{
            ...fill,
            width: core,
            height: core,
            background: "radial-gradient(circle, #FFF4E8 0%, rgba(255, 154, 60, 0.9) 42%, rgba(255, 154, 60, 0) 72%)",
            animation: "du-flash 1300ms cubic-bezier(0.2, 0.7, 0.1, 1) both",
          }}
        />
      )}

      <span
        style={{
          position: "relative",
          width: core,
          height: core,
          borderRadius: 999,
          background: ORB_FILL,
          boxShadow: idle ? "0 6px 18px rgba(255, 154, 60, 0.25)" : "0 10px 32px rgba(255, 154, 60, 0.5)",
          opacity: idle ? 0.72 : 1,
          animation: listening ? "du-breathe 3.2s ease-in-out infinite" : undefined,
          transition: "opacity 400ms, box-shadow 400ms",
        }}
      />
    </span>
  );
}
