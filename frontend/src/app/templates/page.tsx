import Link from "next/link";

const ROUNDS = [
  {
    title: "Round two: Clinic and Studio blends",
    templates: [
      { slug: "ember", name: "Ember", note: "Dark, black and amber, calm glass panels, waveform" },
      { slug: "onyx", name: "Onyx", note: "Dark, pure black and golden yellow, glowing orb" },
      { slug: "lumen", name: "Lumen", note: "Light, Clinic's cards with an amber accent" },
      { slug: "frost", name: "Frost", note: "Light, white with black pills and yellow highlights" },
      { slug: "duo", name: "Duo", note: "Light conversation, dark L'Oréal side panel" },
    ],
  },
  {
    title: "Round one",
    templates: [
      { slug: "noir", name: "Noir", note: "Dark luxury, champagne accent, glowing voice orb" },
      { slug: "atelier", name: "Atelier", note: "Pure white editorial, black ink, one red accent" },
      { slug: "studio", name: "Studio", note: "Dark glass panels, chat bubbles, live waveform" },
      { slug: "clinic", name: "Clinic", note: "Clinical white, rounded cards, dermatology blue" },
      { slug: "caption", name: "Caption", note: "Black and white, giant live captions, inverted sidebar" },
    ],
  },
];

/** UI templates over the same scripted conversation (spec 003 iteration). Add `?camera=1` to open the camera slot. */
export default function TemplatesIndex() {
  return (
    <main style={{ minHeight: "100vh", background: "#fff", color: "#111", padding: "64px", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 40, marginBottom: 32 }}>UI templates</h1>
      {ROUNDS.map((round) => (
        <section key={round.title} style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 26, marginBottom: 16 }}>{round.title}</h2>
          <ul style={{ display: "grid", gap: 14, fontSize: 22 }}>
            {round.templates.map((t) => (
              <li key={t.slug}>
                <Link href={`/templates/${t.slug}`} style={{ textDecoration: "underline" }}>
                  {t.name}
                </Link>{" "}
                <span style={{ color: "#666" }}>{t.note}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
