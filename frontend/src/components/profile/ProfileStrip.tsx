import type { BeautyProfile, Language } from "@/lib/events";
import { profileChips, type Labels } from "@/components/i18n";

/** The zero-party data the conversation builds, one chip per fact, with the consent at the end. */
export function ProfileStrip({
  profile,
  t,
  language,
}: {
  profile: BeautyProfile | null;
  t: Labels;
  language: Language;
}) {
  const chips = profile ? profileChips(profile, language) : [];
  const consent = profile?.consent ?? "pending";

  return (
    <div className="flex items-center gap-8 border-t border-hairline px-16 py-6">
      <h2 className="shrink-0 font-display text-[22px] italic">{t.profile}</h2>
      <span className="h-8 w-px shrink-0 bg-hairline" />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
        {chips.length === 0 && <span className="text-[16px] italic text-mist">{t.profileEmpty}</span>}
        {chips.map((chip) => (
          <span
            key={chip}
            className="animate-rise rounded-full border border-hairline bg-paper/60 px-4 py-1.5 text-[16px] tracking-[0.03em] text-ink-soft"
          >
            {chip}
          </span>
        ))}
      </div>
      {consent !== "pending" && (
        <span
          className={`animate-fade shrink-0 rounded-full px-4 py-1.5 text-[15px] tracking-[0.04em] ${
            consent === "given" ? "bg-ink text-paper" : "border border-hairline text-taupe"
          }`}
        >
          {consent === "given" ? t.savedWithConsent : t.notSaved}
        </span>
      )}
    </div>
  );
}
