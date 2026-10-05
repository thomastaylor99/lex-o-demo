import type { CSSProperties } from "react";

import type { AgentActivity, AgentIdentity } from "@/lib/voice-agent";
import { TRACK, YELLOW } from "@/skins/frost/theme";

import { GOLD } from "./css";
import { VoiceLineBars } from "./VoiceLineBars";
import { VoiceLineSwell } from "./VoiceLineSwell";

const ENDS = "linear-gradient(to right, transparent 0, #000 6%, #000 94%, transparent 100%)";
const SHIMMER = `linear-gradient(to right, rgba(244, 188, 18, 0), ${GOLD} 50%, rgba(244, 188, 18, 0))`;
const TRAIL = "linear-gradient(to right, rgba(255, 210, 63, 0) 0%, rgba(255, 210, 63, 0.5) 62%, #FFD23F 100%)";

/** A full-width layer of the given height, centred on the hairline. */
function centred(height: number): CSSProperties {
  return { position: "absolute", left: 0, right: 0, top: "50%", height, marginTop: -height / 2 };
}

/** Faded at both ends, so the line reads as a stroke rather than a rule. */
const FADED: CSSProperties = { maskImage: ENDS, WebkitMaskImage: ENDS };

/**
 * The header's divider, which is the voice. Idle: a flat hairline. The agent speaking: gold bars
 * rise out of it. The visitor speaking: a soft grey swell. Thinking: a light travels along it. At a
 * handover a yellow comet runs left to right and draws the new agent's voice behind it.
 */
export function VoiceLineWave(props: {
  agents: AgentIdentity[];
  activeAgent: AgentIdentity | null;
  mode: AgentActivity;
  visitorTalking: boolean;
}) {
  const { agents, activeAgent, mode, visitorTalking } = props;
  const id = activeAgent?.id ?? "";
  // Keyed on the agent, the reveal and the comet remount, so their animations play once per handover.
  const handover = agents.findIndex((agent) => agent.id === id) > 0;
  const thinking = mode === "thinking";

  return (
    <div aria-hidden style={{ position: "relative", flex: "none", height: 32, marginTop: -10, overflowX: "clip" }}>
      <span style={{ ...centred(1), ...FADED, background: TRACK }} />

      <span key={`voice-${id}`} className={handover ? "vl-reveal" : undefined} style={{ position: "absolute", inset: 0 }}>
        <VoiceLineSwell on={mode === "listening"} gain={visitorTalking ? 1 : 0.35} />
        <VoiceLineBars on={mode === "speaking"} />
      </span>

      {/* Keyed on thinking, the light restarts from the agent's side each time a reply is prepared. */}
      <span style={{ ...centred(14), ...FADED, overflow: "hidden", opacity: thinking ? 1 : 0, transition: "opacity 420ms ease" }}>
        <span key={String(thinking)} className="vl-shimmer" style={{ ...centred(14), right: "auto", width: "30%" }}>
          <span style={{ ...centred(8), background: SHIMMER, filter: "blur(4px)", opacity: 0.7 }} />
          <span style={{ ...centred(2), background: SHIMMER, borderRadius: 2 }} />
        </span>
      </span>

      {handover && (
        <span key={`sweep-${id}`} style={{ ...centred(40), ...FADED, overflow: "hidden" }}>
          <span className="vl-sweep" style={{ ...centred(2), opacity: 0, background: TRAIL }}>
            <span
              style={{
                position: "absolute",
                right: 0,
                top: -4,
                width: 10,
                height: 10,
                borderRadius: 999,
                background: YELLOW,
                boxShadow: "0 0 14px 6px rgba(255, 210, 63, 0.75)",
              }}
            />
          </span>
        </span>
      )}
    </div>
  );
}
