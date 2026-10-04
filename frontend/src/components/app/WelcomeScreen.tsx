import type { Labels } from "@/components/i18n";

/** The cover page: one invitation and one button (browsers need a click before audio can play). */
export function WelcomeScreen({
  onBegin,
  starting,
  t,
}: {
  onBegin: () => void;
  starting: boolean;
  t: Labels;
}) {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden px-16 py-12">
      <div aria-hidden className="pointer-events-none absolute right-[-6%] top-1/2 size-[62vh] -translate-y-1/2">
        {[0, 1, 2, 3].map((ring) => (
          <div
            key={ring}
            className="absolute rounded-full border border-copper/25"
            style={{
              inset: `${ring * 9}%`,
              animation: `halo-breathe ${5 + ring}s ease-in-out ${ring * 0.6}s infinite`,
            }}
          />
        ))}
        <div className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-copper/70" />
      </div>
      <p className="animate-fade font-display text-[34px] font-medium">L&rsquo;Oréal</p>

      <div className="flex flex-1 flex-col justify-center">
        <h1 className="animate-rise max-w-[16ch] font-display text-[96px] leading-[1.02] tracking-[-0.02em]">
          {t.welcomeTitle} <em className="text-copper">{t.welcomeTitleItalic}</em>
        </h1>
        <p
          className="animate-rise mt-10 max-w-[38rem] text-[24px] font-light leading-relaxed text-ink-soft"
          style={{ animationDelay: "150ms" }}
        >
          {t.welcomeBody}
        </p>
        <div className="animate-rise mt-14 flex items-center gap-8" style={{ animationDelay: "300ms" }}>
          <button
            type="button"
            onClick={onBegin}
            disabled={starting}
            className="group relative grid size-[132px] place-items-center rounded-full border border-ink transition-colors duration-500 hover:bg-ink disabled:opacity-60"
          >
            <span className="font-display text-[22px] italic transition-colors duration-500 group-hover:text-paper">
              {t.begin}
            </span>
            <span
              className="absolute inset-0 rounded-full border border-copper/60"
              style={{ animation: "halo-breathe 3.2s ease-in-out infinite" }}
            />
          </button>
          <p className="max-w-[18rem] text-[15px] leading-relaxed tracking-[0.04em] text-taupe">{t.welcomeNote}</p>
        </div>
      </div>

      <p className="text-[13px] tracking-[0.16em] text-mist">Voice by Mistral AI</p>
    </main>
  );
}
