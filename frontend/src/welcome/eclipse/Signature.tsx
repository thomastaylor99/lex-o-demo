import { BODY, TEXT_FAINT, TEXT_SOFT, u } from "./theme";

/** The discreet credit at the foot of the screen: who built it, and for which event. Text only. */
export function Signature({ builtWith, expedition }: { builtWith: string; expedition: string }) {
  return (
    <p
      className="ec-fade"
      style={{
        margin: 0,
        fontFamily: BODY,
        fontSize: u(16),
        letterSpacing: "0.02em",
        color: TEXT_FAINT,
        textAlign: "center",
        animationDelay: "2100ms",
      }}
    >
      <span style={{ color: TEXT_SOFT }}>{builtWith}</span> {expedition}
    </p>
  );
}
