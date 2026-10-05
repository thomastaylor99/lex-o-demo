import { labels } from "@/components/i18n";
import type { Language } from "@/lib/events";
import type { AgentActivity } from "@/lib/voice-agent";

import { AgentLabel } from "./AgentLabel";
import { LineWave } from "./LineWave";
import { BUBBLE, EASE, fs, INK, MUTED, PARTIAL, TEXT_2 } from "./theme";

/** The height of one line of the visitor's text, so the swell sits level with the first line. */
const LINE = Math.round(fs(24) * 1.42);

/**
 * What the agent says: large black text, no bubble, the name on the first line of a run. Without
 * text it holds the place of a line on its way (the label alone, with its wave); the text then
 * rises in under that same label.
 */
export function AgentLine(props: { text: string | null; name: string | null; live: AgentActivity | null; language: Language }) {
  const { text, name, live, language } = props;

  return (
    <div className="fr-in" style={{ alignSelf: "flex-start", maxWidth: "86%" }}>
      {name && <AgentLabel name={name} live={live} language={language} />}
      {text !== null && (
        <p className="fr-rise" style={{ fontSize: fs(31), lineHeight: 1.36, fontWeight: 500, letterSpacing: "-0.012em", color: INK, textWrap: "pretty" }}>
          {text}
        </p>
      )}
    </div>
  );
}

/**
 * What the visitor says, in a light grey bubble on the right. While the microphone hears them, a
 * soft swell sits just before the bubble and fades once the line is final. With no words yet, the
 * bubble reads "Listening": the microphone is open. The swell stays outside the flow, so nothing moves.
 */
export function VisitorLine(props: { text: string | null; final: boolean; listening: boolean; language: Language }) {
  const { text, final, listening, language } = props;
  const waiting = !text;

  return (
    <div className="fr-in" style={{ position: "relative", alignSelf: "flex-end", maxWidth: "64%", borderRadius: 20, padding: "13px 21px", background: BUBBLE }}>
      <span
        aria-hidden
        style={{
          position: "absolute",
          right: "100%",
          top: 13,
          height: LINE,
          display: "flex",
          alignItems: "center",
          marginRight: 16,
          opacity: listening ? 1 : 0,
          transform: listening ? "none" : "translateX(10px)",
          transition: `opacity 360ms ease, transform 560ms ${EASE}`,
        }}
      >
        <LineWave mode={listening ? "listening" : "idle"} color={MUTED} bars={11} height={24} />
      </span>
      <p
        key={waiting ? "waiting" : "words"}
        className={waiting ? "fr-fade" : final ? undefined : "fr-fade fr-caret"}
        style={{ fontSize: fs(24), lineHeight: 1.42, color: final ? TEXT_2 : PARTIAL, transition: "color 300ms" }}
      >
        {waiting ? labels(language).activity.listening : text}
      </p>
    </div>
  );
}
