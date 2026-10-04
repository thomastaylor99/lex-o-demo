import { useEffect, useRef, type CSSProperties } from "react";

import { formatPrice, profileChips } from "@/components/i18n";

import { CheckIcon, CrossIcon, UserIcon } from "./icons";
import { cx, initial, type PartProps } from "./shared";
import styles from "./studio.module.css";

function Basket({ agent, l, c }: PartProps) {
  const { basket, language } = agent;
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [basket.items]);

  const seen = new Map<string, number>();
  const rows = basket.items.map((item) => {
    const occurrence = (seen.get(item.product_id) ?? 0) + 1;
    seen.set(item.product_id, occurrence);
    return { item, key: occurrence > 1 ? `${item.product_id}-${occurrence}` : item.product_id };
  });

  return (
    <section className={cx(styles.sideSection, styles.basketSection)}>
      <header className={styles.sideHead}>
        <h2 className={styles.sideTitle}>{c.basket}</h2>
        <span className={cx(styles.mono, styles.badge)}>{c.items(basket.items.length)}</span>
      </header>
      {rows.length === 0 ? (
        <p className={styles.basketEmpty}>{c.basketEmpty}</p>
      ) : (
        <ul ref={listRef} className={styles.basketList}>
          {rows.map(({ item, key }) => (
            <li key={key} className={styles.basketItem}>
              <span className={styles.thumb}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/products/${item.product_id}.png`} alt="" className={styles.thumbImg} draggable={false} />
              </span>
              <span className="min-w-0">
                <span className={cx(styles.mono, styles.itemBrand)}>{item.brand}</span>
                <span className={styles.itemName}>{item.name}</span>
              </span>
              <span className={cx(styles.mono, styles.itemPrice)}>{formatPrice(item.price_eur, language)}</span>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.totalRow}>
        <span className={styles.totalLabel}>{l.total}</span>
        <span key={basket.total_eur} className={cx(styles.mono, styles.totalValue, styles.flash)}>
          {formatPrice(basket.total_eur, language)}
        </span>
      </div>
    </section>
  );
}

function Customer({ agent, l, c }: PartProps) {
  const { profile, language } = agent;
  const firstName = profile?.first_name ?? null;
  const chips = profile ? profileChips(profile, language).filter((chip) => chip !== firstName) : [];
  const consent = profile?.consent ?? "pending";

  return (
    <section className={styles.sideSection}>
      <header className={styles.sideHead}>
        <h2 className={styles.sideTitle}>{c.customer}</h2>
      </header>
      <div className={styles.who}>
        <span className={styles.whoAvatar} aria-hidden="true">
          {firstName ? initial(firstName) : <UserIcon />}
        </span>
        <div className="min-w-0">
          <p key={firstName ?? "guest"} className={styles.whoName} data-known={firstName !== null}>
            {firstName ?? c.guest}
          </p>
          <p className={styles.whoSub}>{chips.length > 0 ? l.profile : l.profileEmpty}</p>
        </div>
      </div>
      {chips.length > 0 ? (
        <ul className={styles.chips}>
          {chips.map((chip, index) => (
            <li key={chip} className={styles.chip} style={{ "--i": index } as CSSProperties}>
              {chip}
            </li>
          ))}
        </ul>
      ) : null}
      <p key={consent} className={styles.consent} data-state={consent}>
        <span className={styles.consentIcon} aria-hidden="true">
          {consent === "given" ? <CheckIcon /> : consent === "declined" ? <CrossIcon /> : null}
        </span>
        {consent === "given" ? l.savedWithConsent : consent === "declined" ? l.notSaved : c.consentPending}
      </p>
    </section>
  );
}

/** Basket and customer card. */
export function Sidebar(props: PartProps) {
  return (
    <aside className={cx(styles.glass, styles.side)}>
      <Basket {...props} />
      <div className={styles.sideRule} aria-hidden="true" />
      <Customer {...props} />
    </aside>
  );
}
