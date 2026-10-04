import { MUTED, SURFACE, TEXT } from "./styles";

/** A visitor line: a grey rounded bubble on the right. While the visitor speaks, a caret blinks. */
export function VisitorMessage({ text, final }: { text: string; final: boolean }) {
  return (
    <div className="du-in" style={{ alignSelf: "flex-end", maxWidth: "62%", background: SURFACE, borderRadius: "24px 24px 8px 24px", padding: "16px 26px" }}>
      <p className={final ? undefined : "du-caret"} style={{ fontSize: 24, lineHeight: 1.45, fontWeight: 500, color: final ? TEXT : MUTED, transition: "color 300ms" }}>
        {text}
      </p>
    </div>
  );
}
