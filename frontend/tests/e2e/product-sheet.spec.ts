import { expect, test } from "@playwright/test";

import { l } from "./screen";

/** The product sheet (spec 003): a card in the scripted conversation opens it; Escape and the cross close it. */
test("a product card opens its sheet", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/?mock=1&autostart=1");

  const card = page.getByRole("button", { name: new RegExp(`^${l.moreAbout} La Roche-Posay Toleriane`) });
  await card.click({ timeout: 60_000 });
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("heading", { name: "Toleriane Sensitive Rich Moisturiser" })).toBeVisible();
  await expect(sheet.getByText(l.howToUse, { exact: true })).toBeVisible();
  await expect(sheet.getByRole("link", { name: l.productPage })).toHaveAttribute("target", "_blank");

  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);

  await card.click();
  await sheet.getByRole("button", { name: l.close, exact: true }).click();
  await expect(sheet).toHaveCount(0);
});
