"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { labels, routineStep } from "@/components/i18n";
import type { Language, ProductView } from "@/lib/events";
import type { ProductGroup } from "@/lib/voice-agent";

import { ChevronIcon } from "./icons";
import { ProductCard } from "./ProductCard";
import { ProductDetail } from "./ProductDetail";
import { EASE, INK, TRACK, YELLOW, fs } from "./theme";

/** Card width and gap, so an arrow moves the row by one card. */
const STEP_PX = 264 + 14;

/** The card's lift and the sheet's fade, which inline styles cannot express. Names start with pc-. */
const CAROUSEL_CSS = `
@keyframes pc-fade { from { opacity: 0; } to { opacity: 1; } }
.pc-backdrop { animation: pc-fade 240ms ease-out both; }
.pc-card { transition: transform 240ms ${EASE}, box-shadow 240ms; }
.pc-card:hover { transform: translateY(-6px); box-shadow: 0 14px 28px rgba(11, 11, 12, 0.14) !important; }
.pc-card:active { transform: translateY(-2px) scale(0.99); }
.pc-shot img { transition: transform 360ms ${EASE}; }
.pc-card:hover .pc-shot img { transform: scale(1.06); }
.pc-more { transition: background-color 200ms, transform 240ms ${EASE}; }
.pc-card:hover .pc-more { background: ${YELLOW} !important; transform: scale(1.1); }
.pc-open:focus-visible { outline: 3px solid ${YELLOW}; outline-offset: 3px; }
.pc-arrow { transition: background-color 180ms, opacity 180ms; }
.pc-arrow:disabled { opacity: 0.35; cursor: default; }
@media (prefers-reduced-motion: reduce) {
  .pc-backdrop { animation: none; }
  .pc-card, .pc-card:hover, .pc-card:active, .pc-card:hover .pc-shot img, .pc-card:hover .pc-more { transform: none; }
}
`;

/** Whether the row can scroll back or on, kept current as it scrolls and resizes. */
function useScrollEnds(row: RefObject<HTMLDivElement | null>): { back: boolean; on: boolean } {
  const [ends, setEnds] = useState({ back: false, on: false });
  useEffect(() => {
    const element = row.current;
    if (!element) return;
    const update = () =>
      setEnds({ back: element.scrollLeft > 4, on: element.scrollLeft + element.clientWidth < element.scrollWidth - 4 });
    // The observer also reports once when it starts, which sets the first state.
    const observer = new ResizeObserver(update);
    observer.observe(element);
    element.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", update);
    };
  }, [row]);
  return ends;
}

function Arrow({ label, back, disabled, onClick }: { label: string; back?: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="pc-arrow fr-press"
      style={{ width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: 999, background: "#fff", boxShadow: `inset 0 0 0 1px ${TRACK}`, color: INK, cursor: "pointer" }}
    >
      <span style={{ display: "flex", transform: back ? "scaleX(-1)" : undefined }}>
        <ChevronIcon size={16} />
      </span>
    </button>
  );
}

/**
 * The products, inline at the point of the conversation where they appeared. The row scrolls and
 * snaps card by card, with arrows when it overflows; a card lifts under the pointer and a click
 * opens its product sheet. An empty group shows nothing.
 */
export function ProductCarousel({ group, language }: { group: ProductGroup; language: Language }) {
  const row = useRef<HTMLDivElement>(null);
  const ends = useScrollEnds(row);
  const [open, setOpen] = useState<ProductView | null>(null);
  const close = useCallback(() => setOpen(null), []);
  if (group.products.length === 0) return null;
  const l = labels(language);
  const routine = group.kind === "routine";
  const stepOf = (product: ProductView) => (routine ? routineStep(product.routine_step, language) : null);
  const move = (direction: 1 | -1) => row.current?.scrollBy({ left: direction * STEP_PX, behavior: "smooth" });

  return (
    <section className="fr-in" style={{ alignSelf: "stretch", minWidth: 0, margin: "6px 0 0" }}>
      <style>{CAROUSEL_CSS}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 12 }}>
        <h3 style={{ fontSize: fs(24), fontWeight: 600, letterSpacing: "-0.015em", color: INK }}>
          {routine ? l.completeRoutine : l.selectedForYou}
        </h3>
        {(ends.back || ends.on) && (
          <div style={{ display: "flex", gap: 8 }}>
            <Arrow label={l.previous} back disabled={!ends.back} onClick={() => move(-1)} />
            <Arrow label={l.next} disabled={!ends.on} onClick={() => move(1)} />
          </div>
        )}
      </div>
      {/* Padding gives the top pick's shadow and the hover lift room; the negative margin keeps the cards aligned with the title. */}
      <div
        ref={row}
        className="fr-scroll"
        style={{
          display: "flex",
          gap: 14,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          scrollPaddingLeft: 24,
          padding: "10px 24px 40px",
          margin: "-6px -24px -32px",
        }}
      >
        {group.products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            top={product.id === group.bestMatchId}
            step={stepOf(product)}
            language={language}
            delayMs={120 + index * 110}
            onOpen={() => setOpen(product)}
          />
        ))}
      </div>
      {open && <ProductDetail product={open} top={open.id === group.bestMatchId} step={stepOf(open)} language={language} onClose={close} />}
    </section>
  );
}
