import { labels } from "@/components/i18n";
import type { Language } from "@/lib/events";

import { fs, INK, SURFACE } from "./theme";

/**
 * In place of the talk bar once Stop has ended the conversation: it says so in the conversation
 * language and offers no microphone. Restart, in the header, brings the welcome screen back.
 */
export function EndedBar({ language }: { language: Language }) {
  return (
    <div
      role="status"
      className="fr-fade"
      style={{
        alignSelf: "flex-start",
        display: "flex",
        alignItems: "center",
        gap: 14,
        marginTop: 14,
        borderRadius: 999,
        padding: "8px 24px 8px 8px",
        background: SURFACE,
      }}
    >
      <span aria-hidden style={{ width: 50, height: 50, display: "grid", placeItems: "center", borderRadius: 999, background: "#fff" }}>
        <span style={{ width: 13, height: 13, borderRadius: 3, background: INK }} />
      </span>
      <span style={{ fontSize: fs(21), fontWeight: 500, color: INK }}>{labels(language).conversationEnded}</span>
    </div>
  );
}
