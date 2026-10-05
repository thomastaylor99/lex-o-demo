import { formatPrice, labels } from "@/components/i18n";
import type { Language, ProductView } from "@/lib/events";

import { Packshot } from "./Packshot";
import { CLAMP_2, INK, MUTED, ON_DARK_MUTED, SURFACE, YELLOW, fs } from "./theme";

const CHIP = { position: "absolute", top: 10, left: 10, borderRadius: 999, padding: "5px 11px", fontSize: fs(14), fontWeight: 600 } as const;

/** An approved claim, quoted as the brand wrote it: “…” in English, « … » in French, with no-break spaces. */
function quote(text: string, language: Language): string {
  return language === "fr" ? `«\u00a0${text}\u00a0»` : `“${text}”`;
}

/** One product: packshot on a white well, brand, name, the first approved claim, fragrance-free mark and price. The top pick turns black. */
export function ProductCard(props: { product: ProductView; top: boolean; step: string | null; language: Language; delayMs: number }) {
  const { product, top, step, language, delayMs } = props;
  const l = labels(language);
  const claim = product.claims[0]?.text;

  return (
    <article
      className="fr-in"
      style={{
        animationDelay: `${delayMs}ms`,
        flex: "0 0 240px",
        display: "flex",
        flexDirection: "column",
        borderRadius: 20,
        padding: 10,
        background: top ? INK : SURFACE,
        color: top ? "#fff" : INK,
        boxShadow: top ? "0 16px 36px rgba(11, 11, 12, 0.2)" : "none",
      }}
    >
      <div style={{ position: "relative", height: 156, borderRadius: 12, background: "#fff", overflow: "hidden" }}>
        <Packshot id={product.id} brand={product.brand} name={product.name} padding={14} initialSize={fs(32)} />
        {top && <span style={{ ...CHIP, background: YELLOW, color: INK }}>{l.topPick}</span>}
        {step && <span style={{ ...CHIP, ...(top ? { left: "auto", right: 10 } : {}), background: INK, color: "#fff" }}>{step}</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "12px 6px 4px" }}>
        <p style={{ fontSize: fs(15), color: top ? ON_DARK_MUTED : MUTED }}>{product.brand}</p>
        <h4 style={{ ...CLAMP_2, fontSize: fs(20), fontWeight: 600, lineHeight: 1.25, letterSpacing: "-0.01em", marginTop: 2 }}>{product.name}</h4>
        {claim && (
          <p style={{ ...CLAMP_2, fontSize: fs(16), lineHeight: 1.4, color: top ? "#D6D9DE" : "#4A4F57", marginTop: 6 }}>{quote(claim, language)}</p>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "auto", paddingTop: 12 }}>
          {product.fragrance_free && (
            <span
              style={{
                borderRadius: 999,
                padding: "3px 9px",
                fontSize: fs(13),
                background: top ? "rgba(255, 255, 255, 0.12)" : "#fff",
                color: top ? "#D6D9DE" : MUTED,
              }}
            >
              {l.fragranceFree}
            </span>
          )}
          <span style={{ marginLeft: "auto", fontSize: fs(23), fontWeight: 700, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
            {formatPrice(product.price_eur, language)}
          </span>
        </div>
      </div>
    </article>
  );
}
