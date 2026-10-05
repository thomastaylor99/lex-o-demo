import { expect, test } from "@playwright/test";

import { NoiseFloor, SpeechGate, VAD_THRESHOLD, type GateEvent } from "@/lib/speech-gate";

const FRAME_MS = 64;
const QUIET = 0.003;
const VOICE = 0.1;

/** Feed one RMS per 64 ms frame and keep the events with the time they fired. */
function run(gate: SpeechGate, levels: number[], from = 0): { at: number; event: GateEvent }[] {
  const events: { at: number; event: GateEvent }[] = [];
  levels.forEach((rms, i) => {
    const at = from + i * FRAME_MS;
    const event = gate.frame(at, rms);
    if (event) events.push({ at, event });
  });
  return events;
}

const frames = (rms: number, count: number) => Array.from({ length: count }, () => rms);

test.describe("SpeechGate", () => {
  test("speech starts on the second voiced frame, ends the socket at 450 ms and the line at 700 ms", () => {
    const gate = new SpeechGate();
    const events = run(gate, [...frames(QUIET, 10), ...frames(VOICE, 10), ...frames(QUIET, 15)]);

    expect(events.map((e) => e.event)).toEqual(["start", "soft_end", "end"]);
    const lastVoice = 19 * FRAME_MS;
    expect(events[0].at).toBe(11 * FRAME_MS);
    expect(events[1].at - lastVoice).toBeGreaterThan(450);
    expect(events[1].at - lastVoice).toBeLessThan(450 + FRAME_MS);
    expect(events[2].at - lastVoice).toBeGreaterThan(700);
    expect(events[2].at - lastVoice).toBeLessThan(700 + FRAME_MS);
    expect(gate.speechEnd).toBe(lastVoice);
  });

  test("speech that comes back between 450 and 700 ms resumes the same line", () => {
    const gate = new SpeechGate();
    const events = run(gate, [
      ...frames(QUIET, 10),
      ...frames(VOICE, 5),
      ...frames(QUIET, 9),
      ...frames(VOICE, 5),
      ...frames(QUIET, 12),
    ]);

    expect(events.map((e) => e.event)).toEqual(["start", "soft_end", "resume", "soft_end", "end"]);
  });

  test("the first half second only measures the room", () => {
    const gate = new SpeechGate();
    expect(run(gate, frames(VOICE, 7))).toEqual([]);
  });

  test("one loud frame neither starts nor resumes speech", () => {
    const gate = new SpeechGate();
    const levels = [...frames(QUIET, 10), VOICE, QUIET, VOICE, ...frames(QUIET, 3)];
    const events = run(gate, [...levels, ...frames(VOICE, 3), ...frames(QUIET, 9), VOICE, ...frames(QUIET, 4)]);

    expect(events.map((e) => e.event)).toEqual(["start", "soft_end", "end"]);
    expect(events[0].at).toBe((levels.length + 1) * FRAME_MS);
  });

  test("a line is cut at 20 s even when the room never goes quiet", () => {
    const gate = new SpeechGate();
    const events = run(gate, [...frames(QUIET, 10), ...frames(VOICE, 330)]);

    expect(events.slice(0, 2).map((e) => e.event)).toEqual(["start", "end"]);
    expect(events[1].at - events[0].at).toBeGreaterThan(20_000);
  });

  test("in a noisy hall the threshold rises, so the visitor's silence still ends the line", () => {
    const gate = new SpeechGate();
    const hall = 0.02; // over the quiet-room threshold: every frame would count as speech
    const events = run(gate, [...frames(hall, 48), ...frames(VOICE, 10), ...frames(hall, 15)]);

    expect(events.map((e) => e.event)).toEqual(["start", "soft_end", "end"]);
    expect(events[0].at).toBe(49 * FRAME_MS);
  });

  test("a visitor who talks on and on is not cut short by their own voice", () => {
    const gate = new SpeechGate();
    // syllables and short gaps for 10 s, in a quiet room
    const talk = Array.from({ length: 156 }, (_, i) => (i % 3 === 2 ? 0.02 : VOICE));
    const events = run(gate, [...frames(QUIET, 10), ...talk, ...frames(QUIET, 12)]);

    expect(events.map((e) => e.event)).toEqual(["start", "soft_end", "end"]);
  });
});

test.describe("NoiseFloor", () => {
  test("a quiet room keeps the 0.012 threshold", () => {
    const noise = new NoiseFloor();
    frames(QUIET, 48).forEach((rms) => noise.add(rms));
    expect(noise.threshold()).toBe(VAD_THRESHOLD);
  });

  test("too few frames say nothing about the room", () => {
    const noise = new NoiseFloor();
    frames(0.03, 7).forEach((rms) => noise.add(rms));
    expect(noise.threshold()).toBe(VAD_THRESHOLD);
  });

  test("the threshold is 3 times the quietest fifth of the frames, at most 0.04", () => {
    const noise = new NoiseFloor();
    [0.01, 0.01, 0.01, 0.012, 0.012, 0.012, 0.012, 0.5, 0.5].forEach((rms) => noise.add(rms));
    expect(noise.threshold()).toBeCloseTo(0.03);

    frames(0.05, 48).forEach((rms) => noise.add(rms));
    expect(noise.threshold()).toBe(0.04);
  });
});
