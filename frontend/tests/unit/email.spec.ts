import { expect, test } from "@playwright/test";

import { looksLikeEmail } from "@/lib/email";

test.describe("looksLikeEmail", () => {
  test("a typed address, with spaces around it or capitals", () => {
    for (const typed of ["camille.martin@example.com", " Thomas.Taylor@Mistral.ai ", "jo+recap@mail.example.co.uk"]) {
      expect(looksLikeEmail(typed), typed).toBe(true);
    }
  });

  test("not yet an address: no domain, no extension, spaces or a spoken form", () => {
    for (const typed of ["", "thomas.taylor", "camille@example", "camille martin@example.com", "camille dot martin at example dot com", "@example.com", "camille@.com"]) {
      expect(looksLikeEmail(typed), typed).toBe(false);
    }
  });
});
