"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { formatPrice, labels, textureName } from "@/components/i18n";
import type { Language, ProductView } from "@/lib/events";

import { CloseIcon, ExternalIcon } from "./icons";
import { Packshot } from "./Packshot";
import { quote } from "./ProductCard";
import { Qr } from "./Qr";
import { BUBBLE, FONT, INK, MUTED, SURFACE, TEXT_2, YELLOW, fs } from "./theme";

const CHIP = { borderRadius: 999, padding: "6px 13px", fontSize: fs(15), fontWeight: 600, whiteSpace: "nowrap" } as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 26 }}>
      <h3 style={{ fontSize: fs(17), fontWeight: 600, color: MUTED, marginBottom: 10 }}>{title}</h3>
      {children}
    </section>
  );
}

/**
 * The product sheet, over the conversation: the packshot large, then everything the catalogue holds
 * for this product in the visitor's language (why it suits them, every approved claim and usage
 * note quoted, texture, SPF, size and price per 100 ml) and a code to scan for the brand's page.
 * Escape, the cross or a click outside closes it; the conversation keeps running underneath.
 */
export function ProductDetail(props: { product: ProductView; top: boolean; step: string | null; language: Language; onClose: () => void }) {
  const { product, top, step, language, onClose } = props;
  const l = labels(language);
  const titleId = useId();
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [onClose]);

  const facts = [
    textureName(product.texture, language),
    product.spf ? `SPF ${product.spf}` : null,
    product.fragrance_free ? l.fragranceFree : null,
    `${product.size_ml} ml`,
  ].filter((fact): fact is string => Boolean(fact));
  const per100 = product.size_ml > 0 ? `${formatPrice((product.price_eur / product.size_ml) * 100, language)} ${l.per100ml}` : null;

  return createPortal(
    <div
      className="pc-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "grid",
        placeItems: "center",
        padding: 32,
        background: "rgba(11, 11, 12, 0.32)",
        backdropFilter: "blur(6px)",
        fontFamily: FONT,
        color: INK,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        lang={language}
        className="fr-pop"
        style={{
          position: "relative",
          width: "min(1080px, 100%)",
          maxHeight: "min(860px, 100%)",
          display: "grid",
          gridTemplateColumns: "minmax(0, 0.85fr) minmax(0, 1.15fr)",
          borderRadius: 28,
          overflow: "hidden",
          background: "#fff",
          boxShadow: "0 40px 120px rgba(11, 11, 12, 0.28)",
        }}
      >
        <div style={{ position: "relative", minHeight: 420, background: SURFACE }}>
          {/* Multiply melts the packshot's white background into the grey well. */}
          <div style={{ position: "absolute", inset: 0, mixBlendMode: "multiply" }}>
            <Packshot id={product.id} brand={product.brand} name={product.name} padding={56} initialSize={fs(72)} />
          </div>
          <div style={{ position: "absolute", top: 20, left: 20, display: "flex", gap: 8 }}>
            {top && <span style={{ ...CHIP, background: YELLOW, color: INK }}>{l.topPick}</span>}
            {step && <span style={{ ...CHIP, background: INK, color: "#fff" }}>{step}</span>}
          </div>
        </div>

        <div className="fr-scroll" style={{ minHeight: 0, overflowY: "auto", padding: "40px 44px 36px" }}>
          <p style={{ fontSize: fs(19), color: MUTED }}>{product.brand}</p>
          <h2 id={titleId} style={{ fontSize: fs(40), fontWeight: 600, lineHeight: 1.12, letterSpacing: "-0.025em", marginTop: 4, paddingRight: 40 }}>
            {product.name}
          </h2>
          <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "4px 14px", marginTop: 14 }}>
            <span style={{ fontSize: fs(34), fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{formatPrice(product.price_eur, language)}</span>
            {per100 && <span style={{ fontSize: fs(17), color: MUTED, fontVariantNumeric: "tabular-nums" }}>{per100}</span>}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
            {facts.map((fact) => (
              <span key={fact} style={{ ...CHIP, fontWeight: 500, background: BUBBLE, color: INK }}>
                {fact}
              </span>
            ))}
          </div>

          {product.fit && (
            <div style={{ marginTop: 24, borderRadius: 18, padding: "16px 18px", background: SURFACE }}>
              <p style={{ display: "flex", alignItems: "center", gap: 8, fontSize: fs(17), fontWeight: 600 }}>
                <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: YELLOW }} />
                {l.forYou}
              </p>
              <p style={{ marginTop: 4, fontSize: fs(20), lineHeight: 1.45, color: TEXT_2 }}>{product.fit}</p>
            </div>
          )}

          {product.claims.length > 0 && (
            <Section title={l.aboutProduct}>
              <ul style={{ display: "flex", flexDirection: "column", gap: 10, listStyle: "none" }}>
                {product.claims.map((claim) => (
                  <li key={claim.id} style={{ display: "flex", gap: 12, fontSize: fs(19), lineHeight: 1.5, color: TEXT_2 }}>
                    <span aria-hidden style={{ flex: "none", width: 6, height: 6, marginTop: "0.62em", borderRadius: 999, background: YELLOW }} />
                    {quote(claim.text, language)}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {product.usage_notes.length > 0 && (
            <Section title={l.howToUse}>
              {product.usage_notes.map((note) => (
                <p key={note.id} style={{ fontSize: fs(19), lineHeight: 1.5, color: TEXT_2, marginTop: 6 }}>
                  {quote(note.text, language)}
                </p>
              ))}
            </Section>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 28, borderRadius: 18, padding: 12, background: SURFACE }}>
            <span style={{ display: "flex", borderRadius: 12, padding: 6, background: "#fff" }}>
              <Qr value={product.url} size={96} label={product.url} />
            </span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
              <p style={{ fontSize: fs(17), fontWeight: 500, color: MUTED }}>{l.scanForProduct}</p>
              <a
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="fr-press"
                style={{ display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 999, padding: "8px 15px", background: INK, color: "#fff", fontSize: fs(17), fontWeight: 600, textDecoration: "none" }}
              >
                {l.productPage}
                <ExternalIcon size={15} />
              </a>
            </div>
          </div>
        </div>

        <button
          ref={closeButton}
          type="button"
          onClick={onClose}
          aria-label={l.close}
          className="fr-press"
          style={{ position: "absolute", top: 18, right: 18, width: 44, height: 44, display: "grid", placeItems: "center", borderRadius: 999, background: BUBBLE, color: INK, cursor: "pointer" }}
        >
          <CloseIcon size={20} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
