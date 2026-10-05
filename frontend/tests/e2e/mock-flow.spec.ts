import { expect, test } from "@playwright/test";

import { formatCost, formatPrice } from "@/components/i18n";

import { begin, cameraSwitch, CONCIERGE, expectOnScreen, l, onScreen, SKINCARE } from "./screen";

/*
 * The scripted conversation (src/dev/mockVoiceAgent.ts), no backend needed. It starts 0.6 s after
 * Begin and waits, about 61 s later, for the visitor to type their address; the times below are
 * seconds after Begin.
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

    // 0.6 s: the concierge welcomes; the skincare expert joins at 10.5 s and speaks at 11.7 s
    await expectOnScreen(page, CONCIERGE, 15_000);
    expect(await onScreen(page, SKINCARE), "the skincare expert is on screen before the handover").toBe(false);
    await expect(page.getByText(l.handsFree, { exact: true })).toBeVisible();
    await expect(page.getByText(l.holdToTalk, { exact: true }).first()).toBeVisible();
    await expect(cameraSwitch(page), "the camera switch needs ?camera=1").toHaveCount(0);
    await expectOnScreen(page, SKINCARE, 30_000);
    // The handover shows in the conversation, and the label of the line being spoken carries the voice.
    await expectOnScreen(page, `${SKINCARE} ${l.joined}`, 5_000);
    await expectOnScreen(page, l.activity.speaking, 5_000);

    // 25.3 s: three recommendations with Toleriane as the top pick, each saying why it suits her;
    // 36.0 s: the rest of the routine
    await expect(page.getByText(l.selectedForYou, { exact: true })).toBeVisible({ timeout: 40_000 });
    await expect(page.getByText(TOLERIANE, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(l.topPick, { exact: true })).toBeVisible();
    await expect(page.getByText(l.forYou, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(l.completeRoutine, { exact: true })).toBeVisible({ timeout: 30_000 });

    // 44.4 s: two products in the basket; 44.7 s: four tutorials from the brands' own accounts, each with a code to scan
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

    // 55.0 s: the customer record has the visitor's name and consent
    await expect(page.getByText(l.customerRecord, { exact: true })).toBeVisible();
    await expect(page.getByText("Camille", { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(l.savedWithConsent, { exact: true })).toBeVisible();

    // 55.1 s: the email field takes the focus; a typo is caught on screen, then the typed address
    // fills the record's tenth field and brings the recap with its example offer, and the field goes
    const email = page.getByRole("textbox", { name: l.emailLabel });
    await expect(email).toBeFocused({ timeout: 10_000 });
    // The browser must not remember the address for the next visitor.
    await expect(email).toHaveAttribute("autocomplete", "off");
    await expect(page.getByRole("button", { name: l.emailDismiss })).toBeVisible();
    await email.fill("camille.martin@example");
    await email.press("Enter");
    await expect(page.getByText(l.emailInvalid, { exact: true })).toBeVisible();
    await email.fill("camille.martin@example.com");
    await email.press("Enter");
    await expect(page.getByText(l.recapTitle, { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(email).toHaveCount(0);
    await expect(page.getByText(l.recapPreview, { exact: true })).toBeVisible();
    await expect(page.getByText("Your skincare routine, Camille", { exact: true })).toBeVisible();
    await expect(page.getByText(l.exampleOffer, { exact: true })).toBeVisible();
    await expect(page.getByText("LEX-7Q2M", { exact: true })).toBeVisible();
    await expect(page.getByText(EMAIL, { exact: true })).toHaveCount(2);
    await expect(page.getByText(`11 ${l.of} 12`, { exact: true })).toBeVisible();

    // right quarter: the duration, reply times, and the running cost once the recap is written
    await expect(page.getByText(l.duration, { exact: true })).toBeVisible();
    await expect(page.getByText(l.avgReply, { exact: true })).toBeVisible();
    await expect(page.getByText(l.p90, { exact: true })).toBeVisible();
    await expect(page.getByText(formatCost(0.037, "en"), { exact: true })).toBeVisible();

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
