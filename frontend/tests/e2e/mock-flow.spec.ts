import { expect, test } from "@playwright/test";

import { formatCost, formatPrice } from "@/components/i18n";

import { begin, cameraSwitch, CONCIERGE, expectOnScreen, l, onScreen, RELAY_STEPS, SKINCARE } from "./screen";

/*
 * The scripted conversation (src/dev/mockVoiceAgent.ts), no backend needed. It starts 0.6 s after
 * Begin and ends about 71 s later; the times below are seconds after Begin.
 */
const TOLERIANE = "Toleriane Sensitive Rich Moisturiser";
/** Toleriane (14.17) and the Hydrating Cleanser (7.45). */
const TOTAL = formatPrice(21.62, "en");
/** The visitor's address as the screen shows it: masked, in the record and on the recap. */
const EMAIL = "c***@example.com";

test.describe("scripted conversation (/?mock=1)", () => {
  test("from Begin to Restart", async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto("/?mock=1");
    await expect(page.getByText(l.yourSelection, { exact: true })).toHaveCount(0);
    await begin(page);

    // 0.6 s: the concierge welcomes; the skincare expert takes over at 9.6 s
    await expectOnScreen(page, CONCIERGE, 15_000);
    expect(await onScreen(page, SKINCARE), "the skincare expert is on screen before the handover").toBe(false);
    await expect(page.getByText(l.handsFree, { exact: true })).toBeVisible();
    await expect(page.getByText(l.holdToTalk, { exact: true }).first()).toBeVisible();
    await expect(cameraSwitch(page), "the camera switch needs ?camera=1").toHaveCount(0);
    await expectOnScreen(page, SKINCARE, 30_000);
    for (const step of RELAY_STEPS) await expectOnScreen(page, step, 5_000);

    // 23.5 s: three recommendations with Toleriane as the top pick, each saying why it suits her;
    // 34.2 s: the rest of the routine
    await expect(page.getByText(l.selectedForYou, { exact: true })).toBeVisible({ timeout: 40_000 });
    await expect(page.getByText(TOLERIANE, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(l.topPick, { exact: true })).toBeVisible();
    await expect(page.getByText(l.forYou, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(l.completeRoutine, { exact: true })).toBeVisible({ timeout: 30_000 });

    // 42.6 s: two products in the basket; 42.9 s: four tutorials from the brands' own accounts, each with a code to scan
    await expect(page.getByText(l.yourSelection, { exact: true })).toBeVisible();
    await expect(page.getByText(TOTAL, { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(l.total, { exact: true })).toBeVisible();
    await expect(page.getByText(l.tutorialsTitle, { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(l.official, { exact: true })).toHaveCount(4);
    await expect(page.getByText(l.scanToWatch, { exact: true })).toHaveCount(4);
    // On a computer, each card opens its video in a new tab and the conversation keeps running.
    const videos = page.getByRole("link", { name: new RegExp(`^${l.watch}: `) });
    await expect(videos).toHaveCount(4);
    for (const link of await videos.all()) {
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("href", /^https:\/\//);
    }

    // 53.2 s: the customer record has the visitor's name and consent
    await expect(page.getByText(l.customerRecord, { exact: true })).toBeVisible();
    await expect(page.getByText("Camille", { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(l.savedWithConsent, { exact: true })).toBeVisible();

    // 66.9 s: the masked email fills the record's tenth field; 67.0 s: the recap and its example offer
    await expect(page.getByText(l.recapTitle, { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(l.recapPreview, { exact: true })).toBeVisible();
    await expect(page.getByText("Your skincare routine, Camille", { exact: true })).toBeVisible();
    await expect(page.getByText(l.exampleOffer, { exact: true })).toBeVisible();
    await expect(page.getByText("LEX-7Q2M", { exact: true })).toBeVisible();
    await expect(page.getByText(EMAIL, { exact: true })).toHaveCount(2);
    await expect(page.getByText(`9 ${l.of} 10`, { exact: true })).toBeVisible();

    // header: reply times, and the running cost after the eighth turn
    await expect(page.getByText(l.avgReply, { exact: true })).toBeVisible();
    await expect(page.getByText(l.p90, { exact: true })).toBeVisible();
    await expect(page.getByText(formatCost(0.042, "en"), { exact: true })).toBeVisible();

    // Restart shows the welcome screen again, and Begin starts a clean conversation
    await page.getByRole("button", { name: l.restart }).click();
    await expect(page.getByRole("button", { name: l.begin, exact: true })).toBeVisible();
    await begin(page);
    await expectOnScreen(page, CONCIERGE, 15_000);
    await expect(page.getByText(TOTAL, { exact: true })).toHaveCount(0);
    await expect(page.getByText("Camille", { exact: true })).toHaveCount(0);
    await expect(page.getByText(l.recapTitle, { exact: true })).toHaveCount(0);
  });

  test("?camera=1 opens the camera preview, and the switch closes and reopens it", async ({ page }) => {
    await page.goto("/?mock=1&camera=1");
    await begin(page);
    const preview = page.getByText(l.cameraCaption, { exact: true });
    await expect(cameraSwitch(page)).toBeVisible({ timeout: 15_000 });
    await expect(preview).toBeVisible();
    await cameraSwitch(page).click();
    await expect(preview).toBeHidden();
    await cameraSwitch(page).click();
    await expect(preview).toBeVisible();
  });
});
