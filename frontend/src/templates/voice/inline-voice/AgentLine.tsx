import type { Language } from "@/lib/events";
import type { AgentActivity } from "@/lib/voice-agent";
import { fs, INK } from "@/skins/frost/theme";

import { InlineVoiceAgentLabel } from "./AgentLabel";

/**
 * What the agent says: Frost's large black text, no bubble, the name on the first line of a run.
 * Without text it holds the place of a line on its way (the label alone, with its wave); the text
 * then rises in under that same label.
 */
export function InlineVoiceAgentLine(props: { text: string | null; name: string | null; live: AgentActivity | null; language: Language }) {
  const { text, name, live, language } = props;

  return (
    <div className="fr-in" style={{ alignSelf: "flex-start", maxWidth: "86%" }}>
      {name && <InlineVoiceAgentLabel name={name} live={live} language={language} />}
      {text !== null && (
        <p className="iv-text" style={{ fontSize: fs(31), lineHeight: 1.36, fontWeight: 500, letterSpacing: "-0.012em", color: INK, textWrap: "pretty" }}>
          {text}
        </p>
      )}
    </div>
  );
}
