import { expect, test } from "@playwright/test";

import type { TranscriptEntry } from "@/lib/voice-agent";
import { liveLines } from "@/skins/frost/live";

let next = 0;
function entry(kind: TranscriptEntry["kind"], agent: string | null, final = true): TranscriptEntry {
  return { id: `e${next++}`, kind, agent, text: kind === "agent" || kind === "visitor" ? "Some words" : "", final };
}
const agentLine = (agent = "skincare", final = true) => entry("agent", agent, final);
const visitorLine = (final = true) => entry("visitor", null, final);

test.describe("liveLines", () => {
  test("idle: no line carries the voice", () => {
    expect(liveLines([agentLine(), visitorLine()], "idle")).toEqual({ agentMode: null, agentRun: -1, visitorLine: -1, visitorWaiting: false });
  });

  test("speaking: the first line of the agent's latest run carries the wave", () => {
    const transcript = [visitorLine(), agentLine(), agentLine(), agentLine("skincare", false)];
    expect(liveLines(transcript, "speaking")).toEqual({ agentMode: "speaking", agentRun: 1, visitorLine: -1, visitorWaiting: false });
  });

  test("thinking after the visitor: the agent's next line is on its way", () => {
    expect(liveLines([agentLine(), visitorLine()], "thinking")).toMatchObject({ agentMode: "thinking", agentRun: -1 });
  });

  test("a handover starts a new run: the expert's first line takes the voice", () => {
    const handedOver = [agentLine("concierge"), entry("handover", "skincare")];
    expect(liveLines(handedOver, "thinking").agentRun).toBe(-1);
    expect(liveLines([...handedOver, agentLine("skincare", false)], "speaking").agentRun).toBe(2);
  });

  test("products, tutorials and the recap never take the voice", () => {
    for (const kind of ["products", "tutorials", "recap"] as const) {
      expect(liveLines([visitorLine(), agentLine(), entry(kind, "skincare")], "speaking").agentRun, kind).toBe(1);
    }
  });

  test("listening with nothing heard yet: a waiting bubble, also after a carousel", () => {
    expect(liveLines([agentLine()], "listening")).toEqual({ agentMode: null, agentRun: -1, visitorLine: -1, visitorWaiting: true });
    expect(liveLines([agentLine(), entry("tutorials", "skincare")], "listening").visitorWaiting).toBe(true);
  });

  test("listening while the visitor speaks: their unfinished line is live", () => {
    expect(liveLines([agentLine(), visitorLine(false)], "listening")).toMatchObject({ visitorLine: 1, visitorWaiting: false });
  });

  test("a finished visitor line is no longer live and needs no waiting bubble", () => {
    expect(liveLines([agentLine(), visitorLine()], "listening")).toMatchObject({ visitorLine: -1, visitorWaiting: false });
  });
});
