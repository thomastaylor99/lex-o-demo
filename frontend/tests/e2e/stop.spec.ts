import { expect, test } from "@playwright/test";

import { begin, CONCIERGE, expectOnScreen, l, SKINCARE } from "./screen";

/*
 * Stop in the scripted conversation (src/dev/mockVoiceAgent.ts), no backend needed. Times are
 * seconds after Begin: the expert starts speaking at 11.7 s, the visitor answers at 15.0 s and the
 * profile gets its skin type at 12.2 s.
 */
const WELCOME = "Welcome to L'Oréal! I'm your AI beauty concierge. What are you looking for today?";
const VISITOR = "Hi! I'm looking for a moisturiser, my skin has been feeling really tight lately.";
const EXPERT_STARTS = /^I'm L'Oréal's AI/;
const VISITOR_NEXT = /^It's dry/;
/** Long enough for the next visitor line and a few ticks of the duration, had Stop not worked. */
const WATCH_MS = 5_000;

test.describe("Stop (/?mock=1)", () => {
  test("ends the conversation at once, keeps the screen, then Restart brings the welcome back", async ({ page }) => {
    await page.goto("/?mock=1");
    await begin(page);

    // While the conversation runs, Stop sits to the left of Restart.
    await expectOnScreen(page, CONCIERGE, 15_000);
    const stop = page.getByRole("button", { name: l.stop, exact: true });
    const restart = page.getByRole("button", { name: l.restart, exact: true });
    await expect(stop).toBeVisible();
    const [stopBox, restartBox] = [await stop.boundingBox(), await restart.boundingBox()];
    expect(stopBox!.x + stopBox!.width, "Stop is left of Restart").toBeLessThanOrEqual(restartBox!.x);

    // The expert's first words, then Stop.
    await expectOnScreen(page, SKINCARE, 30_000);
    await expect(page.getByText(EXPERT_STARTS).first()).toBeVisible({ timeout: 15_000 });
    await stop.click();

    // The ended state: the talk bar says so and offers no mic; Stop is gone, Restart stays.
    await expectOnScreen(page, l.conversationEnded, 5_000, "the talk bar says the conversation has ended");
    await expect(stop).toHaveCount(0);
    await expect(restart).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: l.microphoneMode })).toHaveCount(0);
    await expect(page.getByRole("button", { name: l.holdToTalk })).toHaveCount(0);

    // The transcript stays, the expert's line as far as it got.
    await expect(page.getByText(WELCOME, { exact: true })).toBeVisible();
    await expect(page.getByText(VISITOR, { exact: true })).toBeVisible();
    await expect(page.getByText(EXPERT_STARTS).first()).toBeVisible();

    // Nothing moves any more: no new line or word, no profile update, the duration stops counting.
    const conversation = page.locator("main");
    const panel = page.locator("aside");
    const duration = page.getByText(l.duration, { exact: true }).locator("xpath=..");
    const [conversationText, panelText, durationText] = [await conversation.innerText(), await panel.innerText(), await duration.innerText()];
    await page.waitForTimeout(WATCH_MS);
    expect(await conversation.innerText(), "the conversation is unchanged").toBe(conversationText);
    expect(await panel.innerText(), "the basket, the record and the stats are unchanged").toBe(panelText);
    expect(await duration.innerText(), "the duration stopped counting").toBe(durationText);
    await expect(page.getByText(VISITOR_NEXT)).toHaveCount(0);
    await expect(page.getByText(l.customerRecord, { exact: true })).toBeVisible();
    await expect(page.getByText(l.thisConversation, { exact: true })).toBeVisible();

    // Restart shows the welcome screen; Begin starts a clean conversation with Stop back.
    await restart.click();
    await expect(page.getByRole("button", { name: l.begin, exact: true })).toBeVisible();
    await begin(page);
    await expectOnScreen(page, CONCIERGE, 15_000);
    await expect(stop).toBeVisible();
    await expect(page.getByText(l.conversationEnded, { exact: true })).toHaveCount(0);
    await expect(page.getByText(EXPERT_STARTS)).toHaveCount(0);
  });
});
