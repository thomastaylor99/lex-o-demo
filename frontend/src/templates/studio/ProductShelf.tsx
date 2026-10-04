import { useEffect, useRef, type CSSProperties } from "react";

import { formatPrice, routineStep, type Labels } from "@/components/i18n";
import type { Language, ProductView } from "@/lib/events";
import type { ProductGroup } from "@/lib/voice-agent";

import { CheckIcon } from "./icons";
import { cx, quoteClaim, type StudioCopy } from "./shared";
import styles from "./studio.module.css";

interface ProductCardProps {
  product: ProductView;
  index: number;
  step: number | null;
  top: boolean;
  inBasket: boolean;
  language: Language;
  l: Labels;
  c: StudioCopy;
}

function ProductCard({ product, index, step, top, inBasket, language, l, c }: ProductCardProps) {
  const claim = product.claims[0]?.text;
  return (
    <article className={styles.card} data-top={top} style={{ "--i": index } as CSSProperties}>
      <div className={styles.well}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/products/${product.id}.png`}
          alt={product.name}
          className={styles.wellImg}
          draggable={false}
          decoding="async"
        />
        {step !== null && product.routine_step ? (
          <span className={cx(styles.tag, styles.stepTag)}>
            <span className={cx(styles.mono, styles.stepNum)}>{String(step).padStart(2, "0")}</span>
            {routineStep(product.routine_step, language)}
          </span>
        ) : null}
        {top ? <span className={cx(styles.tag, styles.topTag, styles.mono)}>{l.topPick}</span> : null}
        {inBasket ? (
          <span className={cx(styles.tag, styles.basketTag, styles.mono)}>
            <CheckIcon />
            {c.inBasket}
          </span>
        ) : null}
      </div>
      <div className={styles.cardBody}>
        <span className={cx(styles.mono, styles.brand)}>{product.brand}</span>
        <h3 className={styles.productName}>{product.name}</h3>
        {claim ? <p className={styles.claim}>{quoteClaim(claim, language)}</p> : null}
        <div className={styles.priceRow}>
          <span className={cx(styles.mono, styles.price)}>{formatPrice(product.price_eur, language)}</span>
          {product.size_ml ? <span className={cx(styles.mono, styles.size)}>{product.size_ml} ml</span> : null}
        </div>
      </div>
    </article>
  );
}

interface ProductShelfProps {
  group: ProductGroup;
  basketIds: ReadonlySet<string>;
  language: Language;
  l: Labels;
  c: StudioCopy;
}

/** A product group inside the conversation: a snap-scrolling row of glass cards. */
export function ProductShelf({ group, basketIds, language, l, c }: ProductShelfProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const routine = group.kind === "routine";
  const count = group.products.length;

  // Bring the top pick into view when it sits beyond the visible cards.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !group.bestMatchId) return;
    const card = scroller.querySelector<HTMLElement>('[data-top="true"]');
    if (card && card.offsetLeft + card.offsetWidth > scroller.clientWidth) {
      scroller.scrollLeft = card.offsetLeft - 18;
    }
  }, [group.bestMatchId]);

  return (
    <section className={styles.shelf}>
      <header className={styles.groupHead}>
        <h2 className={styles.groupTitle}>{routine ? l.completeRoutine : l.selectedForYou}</h2>
        <span className={cx(styles.mono, styles.groupMeta)}>{routine ? c.steps(count) : c.products(count)}</span>
      </header>
      <div ref={scrollerRef} className={styles.carousel}>
        {group.products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            index={index}
            step={routine ? index + 1 : null}
            top={product.id === group.bestMatchId}
            inBasket={basketIds.has(product.id)}
            language={language}
            l={l}
            c={c}
          />
        ))}
      </div>
    </section>
  );
}
