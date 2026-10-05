import Link from "next/link";

const ECLIPSE_FAMILY = [
  { slug: "eclipse", name: "Eclipse", note: "Chosen for the live screen: a golden eclipse holds the headline and Begin, the L’Oréal logo top left" },
  { slug: "eclipse-couture", name: "Eclipse couture", note: "A fashion campaign: a huge Didone headline, the pure eclipse beside it, a gold outline button, film grain" },
  { slug: "eclipse-gold", name: "Eclipse liquid gold", note: "A molten metallic ring holding a frosted glass Begin, film grain, the L’Oréal logo top left" },
  { slug: "eclipse-icon", name: "Eclipse icon", note: "A fragrance-campaign moment: the serum stands inside the eclipse, back-lit by the gold rim" },
  { slug: "eclipse-horizon", name: "Eclipse horizon", note: "An oversized eclipse whose rim rises like a golden horizon; Begin sits on it" },
];

const ORBIT_FAMILY = [
  { slug: "orbit", name: "Orbit", note: "The original: products float around the luminous pearl" },
  { slug: "orbit-pure", name: "Orbit pure", note: "White, no products: two slow orbits of light around the headline" },
  { slug: "orbit-night", name: "Orbit night", note: "Black, no products: golden stars orbit a glowing pearl, a yellow Begin" },
  { slug: "orbit-ring", name: "Orbit ring", note: "White: the products travel slowly along a fine visible orbit" },
  { slug: "orbit-halo", name: "Orbit halo", note: "White: a sunrise of light behind the headline, the products as a crown above it" },
];

const MOCKUPS = [
  { slug: "maison", name: "Maison", note: "White haute couture: a large serif headline and a breathing voice line; type and motion only" },
  { slug: "vitrine", name: "Vitrine", note: "A boutique window at night: the real products on a glossy black shelf under spotlights, gold accent" },
  { slug: "orbit", name: "Orbit", note: "Airy white: the products drift slowly around a luminous voice; the yellow accent of the conversation screen" },
  { slug: "eclipse", name: "Eclipse", note: "Deep black: one golden halo that breathes like a voice, a cinematic headline; type and motion only" },
  { slug: "cover", name: "Cover", note: "A fashion magazine cover: the L'Oréal masthead, a hero still-life of products, cover lines" },
];

/** Five welcome screen mockups (spec 003, feat/welcome-mockups). Add ?lang=fr, ?state=starting or ?state=error. */
export default function WelcomeMockups() {
  return (
    <main style={{ minHeight: "100vh", background: "#fff", color: "#111", padding: "64px", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 40, marginBottom: 12 }}>Welcome screen mockups</h1>
      <p style={{ fontSize: 18, color: "#666", marginBottom: 32 }}>
        Each opens the scripted conversation on Begin. Add ?lang=fr, ?state=starting or ?state=error to the address.
      </p>
      <h2 style={{ fontSize: 26, margin: "8px 0 14px" }}>Eclipse family</h2>
      <ul style={{ display: "grid", gap: 16, fontSize: 22, marginBottom: 36 }}>
        {ECLIPSE_FAMILY.map((m) => (
          <li key={m.slug}>
            <Link href={`/welcome/${m.slug}`} style={{ textDecoration: "underline" }}>
              {m.name}
            </Link>{" "}
            <span style={{ color: "#666" }}>{m.note}</span>
          </li>
        ))}
      </ul>
      <h2 style={{ fontSize: 26, margin: "8px 0 14px" }}>Orbit family</h2>
      <ul style={{ display: "grid", gap: 16, fontSize: 22, marginBottom: 36 }}>
        {ORBIT_FAMILY.map((m) => (
          <li key={m.slug}>
            <Link href={`/welcome/${m.slug}`} style={{ textDecoration: "underline" }}>
              {m.name}
            </Link>{" "}
            <span style={{ color: "#666" }}>{m.note}</span>
          </li>
        ))}
      </ul>
      <h2 style={{ fontSize: 26, margin: "8px 0 14px" }}>First round</h2>
      <ul style={{ display: "grid", gap: 16, fontSize: 22 }}>
        {MOCKUPS.map((m) => (
          <li key={m.slug}>
            <Link href={`/welcome/${m.slug}`} style={{ textDecoration: "underline" }}>
              {m.name}
            </Link>{" "}
            <span style={{ color: "#666" }}>{m.note}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
