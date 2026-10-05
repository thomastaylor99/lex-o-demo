import { BODY, CHAMPAGNE, DISPLAY, TEXT, u } from "./theme";

/** "L’Oréal" as a text wordmark with the screen's role beneath it, the way "Paris" sits under the logo. */
export function Wordmark({ advisor }: { advisor: string }) {
  return (
    <div
      className="ec-fade"
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: u(6), animationDelay: "200ms" }}
    >
      <span
        style={{
          fontFamily: BODY,
          fontSize: u(40),
          fontWeight: 600,
          lineHeight: 1,
          letterSpacing: "0.02em",
          color: TEXT,
          whiteSpace: "nowrap",
        }}
      >
        L&rsquo;Oréal
      </span>
      <span style={{ fontFamily: DISPLAY, fontStyle: "italic", fontSize: u(25), lineHeight: 1.2, color: CHAMPAGNE }}>
        {advisor}
      </span>
    </div>
  );
}
