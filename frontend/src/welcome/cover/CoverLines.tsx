import type { CoverCopy } from "./copy";
import { BODY, DISPLAY, GOLD, MUTED, TEXT, u } from "./theme";

/**
 * The lead story and the cover lines, in the magazine's voice: a two-line headline, roman then
 * italic gold, one short sub-line, and two cover lines side by side.
 */
export function CoverLines({ copy }: { copy: CoverCopy }) {
  const [first, second] = copy.headline;

  return (
    <div>
      <h2
        className="co-rise"
        style={{
          margin: 0,
          fontFamily: DISPLAY,
          fontSize: u(112),
          fontWeight: 400,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          color: TEXT,
          animationDelay: "260ms",
        }}
      >
        {first}
        <br />
        <em style={{ fontStyle: "italic", color: GOLD }}>{second}</em>
      </h2>

      <p
        className="co-rise"
        style={{
          margin: `${u(26)} 0 0`,
          maxWidth: u(880),
          fontFamily: BODY,
          fontSize: u(29),
          lineHeight: 1.4,
          color: MUTED,
          animationDelay: "340ms",
        }}
      >
        {copy.subLine}
      </p>

      <ul
        className="co-rise"
        style={{
          display: "flex",
          gap: u(80),
          margin: `${u(36)} 0 0`,
          padding: 0,
          listStyle: "none",
          fontFamily: DISPLAY,
          fontSize: u(40),
          lineHeight: 1.12,
          animationDelay: "420ms",
        }}
      >
        {copy.coverLines.map((line) => (
          <li key={line.lead}>
            <span style={{ display: "block", fontStyle: "italic", color: GOLD }}>{line.lead}</span>
            <span style={{ display: "block", color: TEXT }}>{line.rest}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
