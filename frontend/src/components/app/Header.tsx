import type { Language } from "@/lib/events";
import { formatSeconds, type Labels } from "@/components/i18n";

export function Header({
  lastReplyMs,
  onEnd,
  t,
  language,
}: {
  lastReplyMs: number | null;
  onEnd: () => void;
  t: Labels;
  language: Language;
}) {
  return (
    <header className="flex items-center justify-between border-b border-hairline px-16 py-7">
      <div className="flex items-center gap-6">
        <span className="font-display text-[34px] font-medium tracking-[-0.01em]">L&rsquo;Oréal</span>
        <span className="h-7 w-px bg-hairline" />
        <span className="text-[16px] tracking-[0.2em] text-taupe">{t.advisor}</span>
      </div>
      <div className="flex items-center gap-8">
        {lastReplyMs !== null && (
          <p key={lastReplyMs} className="animate-fade flex items-center gap-3 text-[16px] tracking-[0.06em] text-ink-soft">
            <span className="size-1.5 rounded-full bg-copper" />
            {t.repliedIn} <span className="font-display text-[22px] tabular-nums">{formatSeconds(lastReplyMs, language)}</span>
          </p>
        )}
        <button
          type="button"
          onClick={onEnd}
          className="text-[14px] tracking-[0.14em] text-mist transition-colors hover:text-ink"
        >
          {t.end}
        </button>
      </div>
    </header>
  );
}
