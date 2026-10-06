import { existsSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { begin, CONCIERGE, expectOnScreen, SKINCARE } from "./screen";

/*
 * A visitor who stops mid-sentence to find a word (spec 001, End of speech): Chrome's fake
 * microphone plays "I'm looking for a", 1.5 s of silence, then "moisturiser, my skin feels really
 * tight." At 700 ms of silence the line ended after "for a" and the rest was lost. Like
 * live-audio.spec.ts, it runs with LIVE=1 and the backend on :8000:
 *
 *   LIVE=1 npx playwright test --project=e2e live-pause
 */

/** Made by `node tests/fixtures/make-visitor-audio.mjs pause`. */
const PAUSE_WAV = path.join(__dirname, "..", "fixtures", "audio", "visitor-pause-en.wav");
const STEP_MS = 45_000;

test.skip(process.env.LIVE !== "1", "live audio: set LIVE=1, with the backend on :8000");

test.use({
  permissions: ["microphone"],
  launchOptions: {
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      `--use-file-for-fake-audio-capture=${PAUSE_WAV}%noloop`,
      "--autoplay-policy=no-user-gesture-required",
    ],
  },
});

test("a 1.5 s pause after \"for a\" stays inside one line, which the expert answers", { tag: "@golden" }, async ({ page }) => {
  test.setTimeout(240_000);
  expect(existsSync(PAUSE_WAV), "make it with: node tests/fixtures/make-visitor-audio.mjs pause").toBe(true);

  await page.goto("/");
  const firstTurn = page.waitForRequest((r) => r.url().endsWith("/conversation/stream"), { timeout: 2 * STEP_MS });
  await begin(page);
  await expectOnScreen(page, CONCIERGE, STEP_MS, "if it hangs, allow the terminal app in macOS Microphone settings");

  // the first turn carries the words on both sides of the pause
  const sent = (JSON.parse((await firstTurn).postData() ?? "{}") as { text?: string }).text ?? "";
  expect(sent).toMatch(/looking for a moisturi[sz]er/i);
  expect(sent).toMatch(/tight/i);

  await expectOnScreen(page, SKINCARE, STEP_MS);
});
