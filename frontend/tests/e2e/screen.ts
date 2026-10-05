import { expect, type Locator, type Page } from "@playwright/test";

import { labels } from "@/components/i18n";

/** The English labels the screen shows (src/components/i18n.ts), so the tests follow the copy. */
export const l = labels("en");

/** Agent names, as the backend's /config and the scripted conversation give them. */
export const CONCIERGE = "Beauty concierge";
export const SKINCARE = "Skincare expert";

/** Taps Begin on the welcome screen: the one click browsers need before the mic and audio. */
export async function begin(page: Page): Promise<void> {
  const button = page.getByRole("button", { name: l.begin, exact: true });
  await expect(button).toBeEnabled({ timeout: 15_000 });
  await button.click();
}

/** The camera switch in the header, whether it is built as a switch or as a toggle button. */
export function cameraSwitch(page: Page): Locator {
  return page
    .getByRole("switch", { name: l.camera, exact: true })
    .or(page.getByRole("button", { name: l.camera, exact: true }));
}

/**
 * Whether a person sees `text` as a whole element: outside aria-hidden, display:none,
 * visibility:hidden and opacity 0. Agent labels keep their voice pill and state word in the page
 * and fade them out once the line is no longer spoken, and Playwright counts opacity 0 as visible,
 * so `toBeVisible` cannot tell what a person sees.
 */
export function onScreen(page: Page, text: string): Promise<boolean> {
  return page.evaluate((wanted) => {
    const hidden = (start: Element) => {
      for (let el: Element | null = start; el; el = el.parentElement) {
        const style = getComputedStyle(el);
        if (el.getAttribute("aria-hidden") === "true") return true;
        if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return true;
      }
      return false;
    };
    return Array.from(document.body.querySelectorAll("*")).some(
      (el) => el.textContent?.replace(/\s+/g, " ").trim() === wanted && el.getClientRects().length > 0 && !hidden(el),
    );
  }, text);
}

export async function expectOnScreen(page: Page, text: string, timeout: number, why = ""): Promise<void> {
  const message = `"${text}" on screen${why ? ` (${why})` : ""}`;
  await expect.poll(() => onScreen(page, text), { message, timeout }).toBe(true);
}
