import { BODY, CHAMPAGNE, DISPLAY, TEXT, TEXT_SOFT, u } from "../theme";

const FIRST_WORD = 600;
const WORD_STEP = 150;

/**
 * The two-line headline surfacing word by word out of a blur (the second line in italic champagne),
 * then the sub-line. `size` is the type size at 1920×1080; `align` sets left or centred.
 */
export function Words({
  lines,
  sub,
  size,
  align = "center",
  weight = 300,
}: {
  lines: readonly [string, string];
  sub: string;
  size: number;
  align?: "left" | "center";
  weight?: number;
}) {
  const words = lines.map((line) => line.split(" "));
  const lastDelay = FIRST_WORD + (words[0].length + words[1].length - 1) * WORD_STEP;

  return (
    <div style={{ textAlign: align }}>
      <h1 style={{ margin: 0, fontFamily: DISPLAY, fontWeight: weight, fontSize: u(size), lineHeight: 1.02, letterSpacing: "-0.015em", color: TEXT }}>
        {words.map((row, r) => (
          <span key={r} style={{ display: "block", fontStyle: r === 1 ? "italic" : "normal", color: r === 1 ? CHAMPAGNE : TEXT }}>
            {row.map((word, w) => (
              <span key={`${r}-${w}`}>
                {w > 0 && " "}
                <span className="ec-word" style={{ animationDelay: `${FIRST_WORD + ((r === 1 ? words[0].length : 0) + w) * WORD_STEP}ms` }}>
                  {word}
                </span>
              </span>
            ))}
          </span>
        ))}
      </h1>
      <p
        className="ec-rise"
        style={{ margin: `${u(30)} 0 0`, fontFamily: BODY, fontWeight: 300, fontSize: u(24), lineHeight: 1.45, color: TEXT_SOFT, animationDelay: `${lastDelay + 300}ms` }}
      >
        {sub}
      </p>
    </div>
  );
}
