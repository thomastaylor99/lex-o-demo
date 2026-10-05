import { expect, test } from "@playwright/test";

import { EMPTY_REPLY_STATS, replyStats } from "@/lib/voice-agent";

test.describe("replyStats", () => {
  test("no samples gives the empty stats", () => {
    expect(replyStats([])).toEqual(EMPTY_REPLY_STATS);
    expect(EMPTY_REPLY_STATS).toEqual({ count: 0, averageMs: null, p90Ms: null, minMs: null, maxMs: null });
  });

  test("one sample is its own average, p90 and range", () => {
    expect(replyStats([480])).toEqual({ count: 1, averageMs: 480, p90Ms: 480, minMs: 480, maxMs: 480 });
  });

  test("the six replies of the scripted conversation", () => {
    expect(replyStats([450, 600, 520, 640, 580, 610])).toEqual({
      count: 6,
      averageMs: 567,
      p90Ms: 640,
      minMs: 450,
      maxMs: 640,
    });
  });

  test("p90 is the nearest-rank 90th percentile", () => {
    const hundreds = (n: number) => Array.from({ length: n }, (_, i) => (i + 1) * 100);
    expect(replyStats([300, 900]).p90Ms).toBe(900);
    expect(replyStats(hundreds(10)).p90Ms).toBe(900);
    expect(replyStats(hundreds(20)).p90Ms).toBe(1800);
    expect(replyStats(hundreds(100)).p90Ms).toBe(9000);
  });

  test("the average is rounded to the millisecond", () => {
    expect(replyStats([100, 101]).averageMs).toBe(101);
    expect(replyStats([100, 100, 101]).averageMs).toBe(100);
  });

  test("order does not matter and the samples are left untouched", () => {
    const samples = [900, 300, 600];
    expect(replyStats(samples)).toEqual(replyStats([300, 600, 900]));
    expect(samples).toEqual([900, 300, 600]);
  });
});
