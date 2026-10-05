import type { AgentActivity, TranscriptEntry } from "@/lib/voice-agent";

/** Entries that show something on screen. Nobody speaks them, so they never take the voice. */
const SHOWN: ReadonlySet<TranscriptEntry["kind"]> = new Set(["products", "tutorials", "recap"]);

/** Where the voice is, read from the conversation: which line carries the live wave. */
export interface LiveLines {
  /** The agent's state while it has the floor (thinking or speaking), else null. */
  agentMode: AgentActivity | null;
  /** Index of the first line of the agent's latest run, whose label carries the wave; -1 when its line is still on its way. */
  agentRun: number;
  /** Index of the visitor line being heard, or -1. */
  visitorLine: number;
  /** The microphone is open and nothing is heard yet: a listening bubble waits at the bottom. */
  visitorWaiting: boolean;
}

/**
 * Speaking or thinking: the agent's latest run is live, unless the visitor or a handover came after
 * it, in which case the next line is on its way. Listening: the visitor's unfinished line is live,
 * or a waiting bubble when they have not started. Pass "idle" when the session is not live.
 */
export function liveLines(transcript: TranscriptEntry[], activity: AgentActivity): LiveLines {
  const voicing = activity === "speaking" || activity === "thinking";
  let said = transcript.length - 1;
  while (said >= 0 && SHOWN.has(transcript[said].kind)) said--;

  let run = -1;
  const latest = transcript[said];
  if (voicing && latest?.kind === "agent") {
    run = said;
    while (run > 0 && transcript[run - 1].kind === "agent" && transcript[run - 1].agent === latest.agent) run--;
  }

  const last = transcript.at(-1);
  const hearing = activity === "listening";
  return {
    agentMode: voicing ? activity : null,
    agentRun: run,
    visitorLine: hearing && last?.kind === "visitor" && !last.final ? transcript.length - 1 : -1,
    visitorWaiting: hearing && last?.kind !== "visitor",
  };
}
