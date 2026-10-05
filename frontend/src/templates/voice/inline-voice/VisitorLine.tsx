import { labels } from "@/components/i18n";
import type { Language } from "@/lib/events";
import { BUBBLE, EASE, fs, MUTED, PARTIAL, TEXT_2 } from "@/skins/frost/theme";

import { InlineVoiceWave } from "./Wave";

/** The height of one line of text, so the swell sits level with the first line. */
const LINE = Math.round(fs(24) * 1.42);

/**
 * What the visitor says, in Frost's light grey bubble on the right. While the microphone hears them,
 * a soft swell sits just before the bubble and fades once the line is final. With no words yet, the
 * bubble reads "Listening": the microphone is open. The swell stays outside the flow, so nothing moves.
 */
export function InlineVoiceVisitorLine(props: { text: string | null; final: boolean; listening: boolean; language: Language }) {
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
        <InlineVoiceWave mode={listening ? "listening" : "idle"} color={MUTED} bars={11} height={24} />
      </span>
      <p
        key={waiting ? "waiting" : "words"}
        className={waiting ? "iv-fade" : final ? undefined : "iv-fade fr-caret"}
        style={{ fontSize: fs(24), lineHeight: 1.42, color: final ? TEXT_2 : PARTIAL, transition: "color 300ms" }}
      >
        {waiting ? labels(language).activity.listening : text}
      </p>
    </div>
  );
}
