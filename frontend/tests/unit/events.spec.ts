import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { parseEvent, type StreamEvent } from "@/lib/events";

/** One example of every backend event, as the SSE `data:` payloads (written by the backend contract tests). */
const FIXTURE = path.join(__dirname, "..", "fixtures", "stream-events.json");

const TYPES = {
  "turn.started": true,
  "text.delta": true,
  "tool.started": true,
  "tool.finished": true,
  "line.play": true,
  "agent.switched": true,
  "products.shown": true,
  "basket.updated": true,
  "profile.updated": true,
  "turn.done": true,
  error: true,
} satisfies Record<StreamEvent["type"], true>;

interface Frame {
  /** The SSE `event:` name, when the fixture carries it. */
  name: string | null;
  data: string;
}

/** A fixture entry as an SSE frame: an event object, or a raw frame ("event: ...\ndata: {...}"). */
function toFrame(entry: unknown): Frame {
  if (typeof entry !== "string") return { name: null, data: JSON.stringify(entry) };
  const lines = entry.split("\n");
  const name = lines.find((line) => line.startsWith("event:"))?.slice(6).trim() ?? null;
  const data = lines.filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim());
  return { name, data: data.join("\n") };
}

const frames = (): Frame[] => (JSON.parse(readFileSync(FIXTURE, "utf8")) as unknown[]).map(toFrame);

/** The fields the voice engine and the screen read from each event: the backend must keep sending them. */
function expectReadable(event: StreamEvent): void {
  expect(typeof event.turn_id, `${event.type}.turn_id`).toBe("string");
  expect(typeof event.t_ms, `${event.type}.t_ms`).toBe("number");
  switch (event.type) {
    case "turn.started":
      expect(typeof event.agent).toBe("string");
      break;
    case "text.delta":
      expect([typeof event.agent, typeof event.text]).toEqual(["string", "string"]);
      break;
    case "tool.started":
    case "tool.finished":
      expect([typeof event.call_id, typeof event.name]).toEqual(["string", "string"]);
      break;
    case "line.play":
      expect([typeof event.agent, typeof event.line]).toEqual(["string", "string"]);
      break;
    case "agent.switched":
      expect([typeof event.from_agent, typeof event.to_agent]).toEqual(["string", "string"]);
      break;
    case "products.shown":
      expect(event.products.length).toBeGreaterThan(0);
      for (const p of event.products) {
        expect([typeof p.id, typeof p.brand, typeof p.name, typeof p.routine_step, typeof p.price_eur]).toEqual(
          ["string", "string", "string", "string", "number"],
        );
        expect(Array.isArray(p.claims)).toBe(true);
      }
      expect(event.best_match_id === null || event.products.some((p) => p.id === event.best_match_id)).toBe(true);
      break;
    case "basket.updated": {
      const sum = event.items.reduce((total, item) => total + item.price_eur, 0);
      expect(event.total_eur).toBeCloseTo(sum, 2);
      for (const item of event.items) {
        expect([typeof item.product_id, typeof item.name, typeof item.price_eur]).toEqual(["string", "string", "number"]);
      }
      break;
    }
    case "profile.updated":
      expect(["pending", "given", "declined"]).toContain(event.profile.consent);
      expect(Array.isArray(event.profile.concerns)).toBe(true);
      break;
    case "turn.done":
      expect(typeof event.timings.total_ms).toBe("number");
      expect(Array.isArray(event.timings.model_calls)).toBe(true);
      expect(typeof Reflect.get(event, "cost_eur"), "turn.done.cost_eur, the running cost").toBe("number");
      break;
    case "error":
      expect([typeof event.message, typeof event.recoverable]).toEqual(["string", "boolean"]);
      break;
  }
}

test.describe("parseEvent", () => {
  test("rejects an unknown type and malformed JSON", () => {
    expect(() => parseEvent('{"type": "turn.paused", "turn_id": "t", "t_ms": 0}')).toThrow(/Unknown stream event type/);
    expect(() => parseEvent('{"turn_id": "t"}')).toThrow(/Unknown stream event type/);
    expect(() => parseEvent("data: {")).toThrow(SyntaxError);
  });

  test.describe("the backend's events (tests/fixtures/stream-events.json)", () => {
    test.skip(!existsSync(FIXTURE), "tests/fixtures/stream-events.json is not written yet (backend event contract tests)");

    test("every event parses into a known type, the one its SSE frame names", () => {
      for (const frame of frames()) {
        const event = parseEvent(frame.data);
        if (frame.name) expect(event.type, frame.data).toBe(frame.name);
      }
    });

    test("every event type is covered", () => {
      const seen = new Set(frames().map((frame) => parseEvent(frame.data).type));
      expect([...seen].sort()).toEqual(Object.keys(TYPES).sort());
    });

    test("each event carries the fields the screen reads", () => {
      for (const frame of frames()) expectReadable(parseEvent(frame.data));
    });
  });
});
