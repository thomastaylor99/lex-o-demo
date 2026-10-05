import { labels } from "@/components/i18n";
import type { MicMode } from "@/lib/api";
import type { Language } from "@/lib/events";
import { fs, ON_DARK_MUTED } from "@/skins/frost/theme";

const OPTION = {
  borderRadius: 999,
  padding: "10px 18px",
  fontSize: fs(17),
  fontWeight: 600,
  whiteSpace: "nowrap",
  cursor: "pointer",
  transition: "background-color 220ms, color 220ms",
} as const;

/** Hands-free or hold to talk, on the black dock: the chosen option is a lighter pill in white text. */
export function ModeSwitch({ mode, setMode, language }: { mode: MicMode; setMode: (mode: MicMode) => void; language: Language }) {
  const l = labels(language);
  const modes: [MicMode, string][] = [["auto", l.handsFree], ["push_to_talk", l.holdToTalk]];

  return (
    <div role="radiogroup" aria-label={l.microphoneMode} style={{ flex: "none", display: "flex", borderRadius: 999, padding: 4, background: "rgba(255, 255, 255, 0.07)" }}>
      {modes.map(([option, label]) => {
        const on = mode === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setMode(option)}
            style={{ ...OPTION, background: on ? "rgba(255, 255, 255, 0.16)" : "transparent", color: on ? "#fff" : ON_DARK_MUTED }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
