import { labels } from "@/components/i18n";
import type { Language } from "@/lib/events";
import type { AgentActivity } from "@/lib/voice-agent";

import { LineWave } from "./LineWave";
import { EASE, fs, INK, MUTED, YELLOW } from "./theme";

/** The live voice: yellow bars on a small black pill, about 90 by 26 px. */
const PILL = { display: "flex", alignItems: "center", height: 26, padding: "0 10px", borderRadius: 999, background: INK } as const;

/**
 * The agent's name above its line: a yellow dot, then the name. While the line is spoken (or on its
 * way), the voice pill and the state word follow the name. They sit outside the flow and fade, so
 * nothing moves when the voice passes to the next line.
 */
export function AgentLabel({ name, live, language }: { name: string; live: AgentActivity | null; language: Language }) {
  const l = labels(language);
  const on = live !== null;

  return (
    <p style={{ display: "flex", alignItems: "center", gap: 9, height: 24, marginBottom: 6, fontSize: fs(19), fontWeight: 500, color: MUTED, whiteSpace: "nowrap" }}>
      <span aria-hidden style={{ flex: "0 0 8px", height: 8, borderRadius: 999, background: YELLOW }} />
      <span style={{ position: "relative" }}>
        <span>{name}</span>
        <span
          aria-hidden={!on}
          style={{
            position: "absolute",
            left: "100%",
            top: "50%",
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginLeft: 16,
            opacity: on ? 1 : 0,
            transform: `translate(${on ? 0 : -10}px, -50%)`,
            transition: `opacity 360ms ease, transform 560ms ${EASE}`,
          }}
        >
          <span style={PILL}>
            <LineWave mode={live ?? "idle"} color={YELLOW} bars={12} height={16} />
          </span>
          {/* Keyed on the state, so a new word fades in; a line that stops keeps "Speaking" while it fades. */}
          <span key={live ?? "speaking"} className="fr-fade" aria-live="polite">
            {l.activity[live ?? "speaking"]}
          </span>
        </span>
      </span>
    </p>
  );
}
