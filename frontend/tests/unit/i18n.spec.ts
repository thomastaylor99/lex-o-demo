import { expect, test } from "@playwright/test";

import { formatCost, formatPrice, formatSeconds, labels, profileWord } from "@/components/i18n";

/** French numbers carry no-break spaces ("21,62 €", "1 234,50 €"); compare them as plain spaces. */
const plain = (text: string) => text.replace(/[\u00a0\u202f]/g, " ");

/** Every label as [key path, value], nested sets included ("activity.idle", "languageName.fr"). */
function leaves(value: unknown, prefix = ""): [string, unknown][] {
  if (value === null || typeof value !== "object") return [[prefix, value]];
  return Object.entries(value).flatMap(([key, child]) => leaves(child, prefix ? `${prefix}.${key}` : key));
}

test.describe("formatPrice", () => {
  test("English", () => {
    expect(formatPrice(21.62, "en")).toBe("€21.62");
    expect(formatPrice(13.4, "en")).toBe("€13.40");
    expect(formatPrice(1234.5, "en")).toBe("€1,234.50");
  });

  test("French", () => {
    expect(plain(formatPrice(21.62, "fr"))).toBe("21,62 €");
    expect(plain(formatPrice(13.4, "fr"))).toBe("13,40 €");
    expect(plain(formatPrice(1234.5, "fr"))).toBe("1 234,50 €");
  });
});

test.describe("formatSeconds", () => {
  test("English", () => {
    expect(formatSeconds(567, "en")).toBe("0.6 s");
    expect(formatSeconds(1234, "en")).toBe("1.2 s");
    expect(formatSeconds(0, "en")).toBe("0.0 s");
  });

  test("French", () => {
    expect(formatSeconds(567, "fr")).toBe("0,6 s");
    expect(formatSeconds(12_345, "fr")).toBe("12,3 s");
  });
});

test.describe("formatCost", () => {
  test("English, to the tenth of a cent", () => {
    expect(formatCost(0, "en")).toBe("€0.000");
    expect(formatCost(0.031, "en")).toBe("€0.031");
    expect(formatCost(0.0004, "en")).toBe("€0.000");
    expect(formatCost(0.0006, "en")).toBe("€0.001");
    expect(formatCost(1.5, "en")).toBe("€1.500");
  });

  test("French, to the tenth of a cent", () => {
    expect(plain(formatCost(0, "fr"))).toBe("0,000 €");
    expect(plain(formatCost(0.031, "fr"))).toBe("0,031 €");
    expect(plain(formatCost(1.5, "fr"))).toBe("1,500 €");
  });
});

test.describe("profileWord", () => {
  test("English", () => {
    expect(profileWord("dry", "en")).toBe("Dry skin");
    expect(profileWord("sensitivity", "en")).toBe("Sensitivity");
    expect(profileWord("20_to_40", "en")).toBe("€20 to €40");
    expect(profileWord("minimal", "en")).toBe("Short routine");
  });

  test("French", () => {
    expect(profileWord("dry", "fr")).toBe("Peau sèche");
    expect(profileWord("sensitivity", "fr")).toBe("Sensibilité");
    expect(profileWord("20_to_40", "fr")).toBe("20 à 40 €");
    expect(profileWord("minimal", "fr")).toBe("Routine courte");
  });

  test("an unset value gives null and an unknown one is shown as is", () => {
    expect(profileWord(null, "en")).toBeNull();
    expect(profileWord(undefined, "fr")).toBeNull();
    expect(profileWord("", "en")).toBeNull();
    expect(profileWord("not_in_the_list", "fr")).toBe("not_in_the_list");
  });
});

test.describe("labels", () => {
  test("English and French have the same keys", () => {
    const keys = (language: "en" | "fr") => leaves(labels(language)).map(([key]) => key).sort();
    expect(keys("fr")).toEqual(keys("en"));
  });

  test("every label is a non-empty string in both languages", () => {
    for (const language of ["en", "fr"] as const) {
      const empty = leaves(labels(language)).filter(([, value]) => typeof value !== "string" || !value.trim());
      expect(empty.map(([key]) => `${language}.${key}`)).toEqual([]);
    }
  });
});
