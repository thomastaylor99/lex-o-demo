import { labels } from "@/components/i18n";
import type { Language } from "@/lib/events";
import type { TutorialGroup } from "@/lib/voice-agent";

import { TutorialCard } from "./TutorialCard";
import { INK, fs } from "./theme";

/** The tutorials for the routine, inline where they appeared, like a product carousel. An empty group shows nothing. */
export function Tutorials({ group, language }: { group: TutorialGroup; language: Language }) {
  if (group.tutorials.length === 0) return null;
  const l = labels(language);

  return (
    <section className="fr-in" style={{ alignSelf: "stretch", minWidth: 0, margin: "6px 0 0" }}>
      <h3 style={{ fontSize: fs(24), fontWeight: 600, letterSpacing: "-0.015em", color: INK, marginBottom: 12 }}>{l.tutorialsTitle}</h3>
      {/* The same gutter as the product carousels, so both rows line up with the titles. */}
      <div className="fr-scroll" style={{ display: "flex", gap: 14, overflowX: "auto", padding: "4px 24px 28px", margin: "0 -24px -20px" }}>
        {group.tutorials.map((tutorial, index) => (
          <TutorialCard key={tutorial.id} tutorial={tutorial} language={language} delayMs={120 + index * 110} />
        ))}
      </div>
    </section>
  );
}
