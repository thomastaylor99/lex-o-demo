import { BODY, DISPLAY, GOLD, MUTED, TEXT, u } from "./theme";

/**
 * The top of the cover: the issue line and the advisor's name in the folio, then the L’Oréal
 * masthead in a high-contrast Didone, mixed case, across the top.
 */
export function Masthead({ dateLine, advisor }: { dateLine: string; advisor: string }) {
  return (
    <header style={{ position: "absolute", left: u(88), right: u(88), top: u(44) }}>
      <div
        className="co-rise"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", animationDelay: "60ms" }}
      >
        <span style={{ fontFamily: BODY, fontSize: u(23), letterSpacing: "0.01em", color: MUTED }}>{dateLine}</span>
        <span style={{ fontFamily: DISPLAY, fontStyle: "italic", fontSize: u(32), color: GOLD }}>{advisor}</span>
      </div>

      <h1
        className="co-settle"
        style={{
          margin: `${u(-6)} 0 0 ${u(-14)}`,
          fontFamily: DISPLAY,
          fontSize: u(330),
          fontWeight: 500,
          lineHeight: 0.92,
          letterSpacing: "-0.035em",
          color: TEXT,
          whiteSpace: "nowrap",
        }}
      >
        L’Oréal
      </h1>
    </header>
  );
}
