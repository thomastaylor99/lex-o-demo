import { expect, test } from "@playwright/test";

import { endAfterMs, HOLD_MS, looksUnfinished } from "@/lib/hesitation";
import { END_MS } from "@/lib/speech-gate";

// Final texts from realtime STT when the socket ended after the words (probe of 2026-10-06).

test.describe("looksUnfinished", () => {
  test("a sentence cut mid-way, as STT writes it", () => {
    for (const text of [
      "I am looking for a", // no closing punctuation
      "My skin is quite dry, so",
      "I need something for",
      "Je cherche",
      "J'ai la peau sèche et",
      "My skin is...", // trailing off
      "Je cherche une crème qui...",
      "Something with…",
      "I am looking for um.", // closing punctuation after a filler or a connecting word
      "Je voudrais une crème pour.",
      "I would like to.",
      "Cream with?",
      "",
    ]) {
      expect(looksUnfinished(text), text).toBe(true);
    }
  });

  test("a whole answer or question", () => {
    for (const text of [
      "Yes.",
      "Dry skin.",
      "Yes, I think so.",
      "That is what I am looking for.",
      "Under 50 euros.",
      "Moins de 50.",
      "Hi, I am looking for a moisturizer. My skin has been feeling really tight lately.",
      "What is it for?",
      "Est-ce que vous avez un sérum ?",
      "Oui, ajoutez-la.",
      "C'est parfait. Merci!",
    ]) {
      expect(looksUnfinished(text), text).toBe(false);
    }
  });

  test("only the end of the line counts", () => {
    expect(looksUnfinished("I am looking for a moisturiser. And")).toBe(true);
    expect(looksUnfinished("I am looking for a moisturiser and, um, something light.")).toBe(false);
  });
});

test.describe("endAfterMs", () => {
  test("a finished line ends after 700 ms of silence, an unfinished one after 1.8 s", () => {
    expect(endAfterMs("I am looking for a moisturizer.")).toBe(END_MS);
    expect(END_MS).toBe(700);
    expect(endAfterMs("I am looking for a")).toBe(HOLD_MS);
    expect(HOLD_MS).toBe(1_800);
  });
});
