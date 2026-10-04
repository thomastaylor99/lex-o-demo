import type { AgentActivity, AgentIdentity } from "@/lib/voice-agent";
import type { Labels } from "@/components/i18n";

/** The live voice: thin copper rings that breathe while listening, turn while thinking, ripple while speaking. */
function VoiceHalo({ activity }: { activity: AgentActivity }) {
  return (
    <div className="relative size-24 shrink-0" aria-hidden>
      <div className="absolute inset-0 rounded-full border border-hairline" />
      {activity === "listening" && (
        <div
          className="absolute inset-2 rounded-full border border-copper/60"
          style={{ animation: "halo-breathe 3.2s ease-in-out infinite" }}
        />
      )}
      {activity === "thinking" && (
        <div
          className="absolute inset-1 rounded-full border border-transparent border-t-copper border-r-copper/40"
          style={{ animation: "halo-orbit 1.6s linear infinite" }}
        />
      )}
      {activity === "speaking" &&
        [0, 0.45, 0.9].map((delay) => (
          <div
            key={delay}
            className="absolute inset-3 rounded-full border border-copper"
            style={{ animation: `halo-ripple 1.35s ${delay}s ease-out infinite` }}
          />
        ))}
      <div
        className={`absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-500 ${
          activity === "idle" ? "bg-mist" : "bg-copper"
        }`}
      />
    </div>
  );
}

export function AgentPresence({
  agent,
  activity,
  t,
}: {
  agent: AgentIdentity | null;
  activity: AgentActivity;
  t: Labels;
}) {
  return (
    <div className="flex items-center gap-7">
      <VoiceHalo activity={activity} />
      <div className="min-w-0">
        {/* keyed on the agent so a handover re-plays the entrance */}
        <h2
          key={agent?.id ?? "none"}
          className="animate-rise font-display text-[44px] italic leading-none tracking-[-0.01em]"
        >
          {agent?.displayName ?? " "}
        </h2>
        <p className="mt-3 flex items-center gap-3 text-[15px] tracking-[0.14em] text-taupe">
          <span>{agent?.roleLabel}</span>
          <span className="h-px w-6 bg-hairline" />
          <span className={activity === "idle" ? "" : "text-copper"}>{t.activity[activity]}</span>
        </p>
      </div>
    </div>
  );
}
