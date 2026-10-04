import type { Basket, Language, ProductView } from "@/lib/events";
import type { ProductGroup } from "@/lib/voice-agent";
import { formatPrice, routineStep, type Labels } from "@/components/i18n";
import { ProductImage } from "@/components/discovery/ProductImage";

function Facts({ product, t }: { product: ProductView; t: Labels }) {
  const facts = [product.spf ? `SPF ${product.spf}` : null, product.fragrance_free ? t.fragranceFree : null].filter(
    Boolean,
  );
  if (!facts.length) return null;
  return (
    <div className="flex gap-2">
      {facts.map((fact) => (
        <span key={fact} className="rounded-full border border-hairline px-3 py-1 text-[13px] tracking-[0.04em] text-taupe">
          {fact}
        </span>
      ))}
    </div>
  );
}

function TopPick({ product, t, language }: { product: ProductView; t: Labels; language: Language }) {
  const claim = product.claims[0]?.text;
  return (
    <article key={product.id} className="animate-rise grid grid-cols-[200px_1fr] gap-7">
      <ProductImage id={product.id} brand={product.brand} name={product.name} className="h-[250px] border border-hairline" />
      <div className="flex min-w-0 flex-col">
        <p className="text-[13px] tracking-[0.18em] text-copper">{t.topPick}</p>
        <p className="mt-3 text-[14px] tracking-[0.16em] text-taupe">{product.brand}</p>
        <h3 className="mt-1 font-display text-[30px] leading-[1.15]">{product.name}</h3>
        {claim && (
          <p className="mt-4 line-clamp-3 text-[17px] font-light italic leading-relaxed text-ink-soft">
            &ldquo;{claim}&rdquo;
          </p>
        )}
        <div className="mt-auto flex items-end justify-between gap-4 pt-4">
          <Facts product={product} t={t} />
          <p className="font-display text-[26px]">{formatPrice(product.price_eur, language)}</p>
        </div>
      </div>
    </article>
  );
}

function Compact({ product, language, index }: { product: ProductView; language: Language; index: number }) {
  return (
    <article
      className="animate-rise flex items-center gap-4 border-t border-hairline pt-4"
      style={{ animationDelay: `${150 + index * 120}ms` }}
    >
      <ProductImage id={product.id} brand={product.brand} name={product.name} className="size-[72px] shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] tracking-[0.16em] text-taupe">{product.brand}</p>
        <p className="truncate font-display text-[19px]">{product.name}</p>
      </div>
      <p className="text-[17px] text-ink-soft">{formatPrice(product.price_eur, language)}</p>
    </article>
  );
}

function RoutineRow({ product, language, index }: { product: ProductView; language: Language; index: number }) {
  return (
    <article
      className="animate-rise grid grid-cols-[72px_1fr_auto] items-center gap-4"
      style={{ animationDelay: `${index * 140}ms` }}
    >
      <ProductImage id={product.id} brand={product.brand} name={product.name} className="size-[72px] border border-hairline" />
      <div className="min-w-0">
        <p className="text-[12px] tracking-[0.16em] text-copper">{routineStep(product.routine_step, language)}</p>
        <p className="truncate font-display text-[19px]">{product.name}</p>
        <p className="text-[13px] tracking-[0.12em] text-taupe">{product.brand}</p>
      </div>
      <p className="text-[17px] text-ink-soft">{formatPrice(product.price_eur, language)}</p>
    </article>
  );
}

function BasketSummary({ basket, t, language }: { basket: Basket; t: Labels; language: Language }) {
  if (!basket.items.length) return null;
  return (
    <section className="animate-fade border-t border-ink/80 pt-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="font-display text-[22px] italic">{t.yourSelection}</h3>
        <p className="text-[14px] tracking-[0.12em] text-taupe">{basket.items.length}</p>
      </div>
      <ul className="space-y-1.5">
        {basket.items.map((item) => (
          <li key={item.product_id} className="animate-fade flex justify-between gap-4 text-[16px] text-ink-soft">
            <span className="truncate">
              {item.brand} {item.name}
            </span>
            <span>{formatPrice(item.price_eur, language)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-baseline justify-between border-t border-hairline pt-3">
        <span className="text-[14px] tracking-[0.16em] text-taupe">{t.total}</span>
        <span className="font-display text-[28px]">{formatPrice(basket.total_eur, language)}</span>
      </div>
    </section>
  );
}

/** What the advisor has found, newest first: the top pick, its alternatives, the routine, the basket. */
export function DiscoveryPanel({
  groups,
  basket,
  t,
  language,
}: {
  groups: ProductGroup[];
  basket: Basket;
  t: Labels;
  language: Language;
}) {
  const recommendations = groups.filter((g) => g.kind === "recommendation");
  const latest = recommendations.at(-1);
  const routine = groups.filter((g) => g.kind === "routine").at(-1);
  const earlier = recommendations.slice(0, -1).flatMap((g) => g.products);
  // Follow the conversation: once the expert builds the routine, it takes the top spot.
  const routineInFocus = !!routine && groups.at(-1)?.kind === "routine";

  const best = latest?.products.find((p) => p.id === latest.bestMatchId) ?? latest?.products[0];
  const alternatives = latest?.products.filter((p) => p.id !== best?.id) ?? [];

  const routineSection = routine && routine.products.length > 0 && (
    <section key={routine.id} className="space-y-4">
      <h3 className="font-display text-[22px] italic">{t.completeRoutine}</h3>
      {routine.products.map((product, index) => (
        <RoutineRow key={product.id} product={product} language={language} index={index} />
      ))}
    </section>
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-8">
      <h2 className="font-display text-[26px] italic text-ink-soft">{t.selectedForYou}</h2>

      {!latest && !routine && (
        <div className="grid flex-1 place-items-center border border-dashed border-hairline">
          <p className="max-w-[18rem] text-center font-display text-[22px] italic leading-snug text-mist">
            {t.emptyDiscovery}
          </p>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-8 overflow-y-auto pr-2 [scrollbar-width:none]">
        {routineInFocus && routineSection}

        {best && !routineInFocus && (
          <section key={latest?.id} className="space-y-5">
            <TopPick product={best} t={t} language={language} />
            {alternatives.length > 0 && (
              <div className="space-y-3">
                <p className="text-[13px] tracking-[0.16em] text-taupe">{t.alsoConsider}</p>
                {alternatives.map((product, index) => (
                  <Compact key={product.id} product={product} language={language} index={index} />
                ))}
              </div>
            )}
          </section>
        )}

        {best && routineInFocus && (
          <section className="space-y-3">
            <p className="text-[13px] tracking-[0.16em] text-copper">{t.topPick}</p>
            <Compact product={best} language={language} index={0} />
          </section>
        )}

        {!routineInFocus && routineSection}

        {(earlier.length > 0 || (routineInFocus && alternatives.length > 0)) && (
          <details className="text-[15px] text-taupe">
            <summary className="cursor-pointer tracking-[0.08em]">{t.earlier}</summary>
            <ul className="mt-2 space-y-1">
              {[...(routineInFocus ? alternatives : []), ...earlier].map((p) => (
                <li key={p.id}>
                  {p.brand} {p.name}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <BasketSummary basket={basket} t={t} language={language} />
    </div>
  );
}
