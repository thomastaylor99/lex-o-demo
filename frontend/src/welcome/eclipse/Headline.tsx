import { CHAMPAGNE, DISPLAY, BODY, GOLD, TEXT, TEXT_SOFT, u } from "./theme";

/** When the first word appears, and the pause between words, in milliseconds. */
const FIRST_WORD = 600;
const WORD_STEP = 150;

/**
 * The title card inside the eclipse: two lines in a light serif that surface word by word out of a
 * blur, a short gold line, then the sub-line.
 */
export function Headline({ lines, sub }: { lines: readonly [string, string]; sub: string }) {
  const words = lines.map((line) => line.split(" "));
  const lastDelay = FIRST_WORD + (words[0].length + words[1].length - 1) * WORD_STEP;

  return (
    <div style={{ textAlign: "center" }}>
      <h1
        style={{
          margin: 0,
          fontFamily: DISPLAY,
          fontWeight: 300,
          fontSize: u(84),
          lineHeight: 1.04,
          letterSpacing: "-0.01em",
          color: TEXT,
        }}
      >
        {words.map((row, r) => (
          <span
            key={r}
            style={{ display: "block", fontStyle: r === 1 ? "italic" : "normal", color: r === 1 ? CHAMPAGNE : TEXT }}
          >
            {row.map((word, w) => (
              <span key={`${r}-${w}`}>
                {w > 0 && " "}
                <span
                  className="ec-word"
                  style={{ animationDelay: `${FIRST_WORD + ((r === 1 ? words[0].length : 0) + w) * WORD_STEP}ms` }}
                >
                  {word}
                </span>
              </span>
            ))}
          </span>
        ))}
      </h1>

      <span
        aria-hidden
        className="ec-fade"
        style={{
          display: "block",
          width: u(64),
          height: 1,
          margin: `${u(26)} auto`,
          background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
          animationDelay: `${lastDelay + 200}ms`,
        }}
      />

      <p
        className="ec-rise"
        style={{
          margin: 0,
          fontFamily: BODY,
          fontWeight: 300,
          fontSize: u(25),
          lineHeight: 1.4,
          color: TEXT_SOFT,
          animationDelay: `${lastDelay + 300}ms`,
        }}
      >
        {sub}
      </p>
    </div>
  );
}
