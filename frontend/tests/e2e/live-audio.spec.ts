import { existsSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { formatCost } from "@/components/i18n";
import { parseEvent, type StreamEvent } from "@/lib/events";

import { begin, CONCIERGE, expectOnScreen, SKINCARE } from "./screen";

/*
 * Real audio through the browser, against the live backend (Mistral STT, LLM and TTS): Chrome's
 * fake microphone plays a TTS-made visitor sentence, and the screen must show it all. Run with
 * LIVE=1, the backend on :8000 and the production build (`npm run build`):
 *
 *   LIVE=1 npx playwright test --project=e2e --grep @golden
 */

/** Made by tests/fixtures/make-visitor-audio.mjs: 8 s of silence, the sentence, 4 s of silence. */
const VISITOR_WAV = path.join(__dirname, "..", "fixtures", "audio", "visitor-moisturiser-en.wav");
const STEP_MS = 45_000;

test.skip(process.env.LIVE !== "1", "live audio: set LIVE=1, with the backend on :8000");

test.use({
  permissions: ["microphone"],
  launchOptions: {
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      `--use-file-for-fake-audio-capture=${VISITOR_WAV}%noloop`,
      "--autoplay-policy=no-user-gesture-required",
    ],
  },
});

/** The events of one SSE body, read with the app's own parser. */
function sseEvents(body: string): StreamEvent[] {
  return body
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => parseEvent(line.slice(5).trim()));
}

test("a spoken request reaches the skincare expert", { tag: "@golden" }, async ({ page }) => {
  test.setTimeout(240_000);
  expect(existsSync(VISITOR_WAV), "make it with: node tests/fixtures/make-visitor-audio.mjs").toBe(true);

  await page.goto("/");
  const firstTurn = page.waitForResponse((r) => r.url().endsWith("/conversation/stream"), { timeout: 2 * STEP_MS });
  await begin(page);
  // the session goes live once the mic opens; on macOS that needs the microphone allowed for the
  // app that launched Chrome (the terminal), even for Chrome's fake device
  await expectOnScreen(page, CONCIERGE, STEP_MS, "if it hangs, allow the terminal app in macOS Microphone settings");

  // the visitor's words, transcribed live from the fake microphone
  await expect(page.getByText(/moisturi[sz]er/i).first()).toBeVisible({ timeout: STEP_MS });

  // the concierge hands over on the first turn
  await expectOnScreen(page, SKINCARE, STEP_MS);

  // what the stream said is what the screen shows
  const events = sseEvents(await (await firstTurn).text());
  const said = events
    .flatMap((event) => (event.type === "text.delta" && event.agent === "skincare" ? [event.text] : []))
    .join("")
    .trim();
  expect(said, "the skincare expert speaks on the first turn").not.toBe("");
  const opening = said.split(/\s+/).slice(0, 4).join(" ");
  await expect(page.getByText(opening).first()).toBeVisible({ timeout: STEP_MS });

  // the running cost leaves zero once the turn is billed
  const cost = page.getByText(/^€\d+\.\d{3}$/).first();
  await expect(cost).toBeVisible();
  await expect(cost).not.toHaveText(formatCost(0, "en"), { timeout: STEP_MS });
});
