import type { ComponentType } from "react";

import { FONT, INK, YELLOW } from "@/skins/frost/theme";

/** The welcome screen's serif, so the conversation screen can echo it. */
const SERIF = "var(--font-eclipse-display), 'Cormorant Garamond', Garamond, serif";

/** "Beauty advisor" → ["Beauty", "advisor"]; "Conseil beauté" → ["Conseil", "beauté"]. */
function split(text: string): [string, string] {
  const space = text.indexOf(" ");
  return space < 0 ? [text, ""] : [text.slice(0, space), text.slice(space + 1)];
}

/** Geist for the first word, the welcome's serif in italic for the second: the two screens' voices in one name. */
function SerifDuo({ text }: { text: string }) {
  const [first, second] = split(text);
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 9, whiteSpace: "nowrap", color: INK }}>
      <span style={{ fontFamily: FONT, fontSize: 27, fontWeight: 600, letterSpacing: "-0.025em" }}>{first}</span>
      <span style={{ fontFamily: SERIF, fontSize: 35, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.01em" }}>{second}</span>
    </span>
  );
}

const BARS = [9, 17, 24, 15, 9];

/** A black disc holding the yellow voice, as on the line being spoken, then the name in Geist. */
function VoiceBadge({ text }: { text: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 13, whiteSpace: "nowrap" }}>
      <span aria-hidden style={{ width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center", gap: 3, borderRadius: 999, background: INK }}>
        {BARS.map((height, index) => (
          <span key={index} style={{ width: 3.5, height, borderRadius: 3, background: YELLOW }} />
        ))}
      </span>
      <span style={{ fontFamily: FONT, fontSize: 26, fontWeight: 600, letterSpacing: "-0.025em", color: INK }}>{text}</span>
    </span>
  );
}

const METAL = "conic-gradient(from 210deg, #8A6A2F, #F6E3B0 18%, #C9A055 36%, #FFF4D6 52%, #B8893E 70%, #8A6A2F)";

/** The welcome's golden eclipse, small, then the name in its serif: the conversation keeps the welcome's signature. */
function GoldHalo({ text }: { text: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 14, whiteSpace: "nowrap" }}>
      {/* A black disc inside a gold rim that glows: the welcome's eclipse at the size of a letter. */}
      <span
        aria-hidden
        style={{ position: "relative", width: 32, height: 32, borderRadius: 999, background: METAL, boxShadow: "0 0 14px rgba(226, 184, 101, 0.55)" }}
      >
        <span style={{ position: "absolute", inset: 3, borderRadius: 999, background: "radial-gradient(circle at 50% 40%, #1C150B, #050505 70%)" }} />
      </span>
      <span style={{ fontFamily: SERIF, fontSize: 34, fontWeight: 500, letterSpacing: "-0.005em", color: INK }}>{text}</span>
    </span>
  );
}

/** The name in bold Geist, the dot of its "i" in the screen's yellow: one quiet detail. */
function YellowDot({ text }: { text: string }) {
  const at = text.indexOf("i");
  const word = { fontFamily: FONT, fontSize: 28, fontWeight: 700, letterSpacing: "-0.035em", color: INK, whiteSpace: "nowrap" } as const;
  if (at < 0) return <span style={word}>{text}</span>;
  return (
    <span aria-label={text} style={word}>
      <span aria-hidden>
        {text.slice(0, at)}
        <span style={{ position: "relative" }}>
          ı
          <span style={{ position: "absolute", left: "50%", top: "0.2em", width: "0.2em", height: "0.2em", borderRadius: 999, background: YELLOW, transform: "translateX(-50%)" }} />
        </span>
        {text.slice(at + 1)}
      </span>
    </span>
  );
}

/** A yellow marker under the second word, as the first Frost welcome drew its title. */
function Marker({ text }: { text: string }) {
  const [first, second] = split(text);
  const band = `linear-gradient(to bottom, transparent 58%, ${YELLOW} 58%, ${YELLOW} 90%, transparent 90%)`;
  return (
    <span style={{ fontFamily: FONT, fontSize: 28, fontWeight: 700, letterSpacing: "-0.035em", color: INK, whiteSpace: "nowrap" }}>
      {first} <span style={{ backgroundImage: band, padding: "0 0.08em" }}>{second}</span>
    </span>
  );
}

export interface TitleVariant {
  id: string;
  name: string;
  note: string;
  Title: ComponentType<{ text: string }>;
}

export const TITLES: TitleVariant[] = [
  { id: "serif-duo", name: "Serif duo", note: "Geist and the welcome's italic serif: links the two screens", Title: SerifDuo },
  { id: "voice-badge", name: "Voice badge", note: "A black disc with the yellow voice: says voice before a word is read", Title: VoiceBadge },
  { id: "gold-halo", name: "Gold halo", note: "The welcome's golden eclipse, small, with its serif: the most luxurious", Title: GoldHalo },
  { id: "yellow-dot", name: "Yellow dot", note: "Bold Geist, the dot of the i in yellow: the quietest", Title: YellowDot },
  { id: "marker", name: "Marker", note: "A yellow marker under the second word: the boldest, most Frost", Title: Marker },
];
