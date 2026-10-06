/**
 * How long a silence ends the visitor's line (spec 001, End of speech), from the words heard so
 * far. Pure, so it runs in tests.
 *
 * A line that looks finished ends after END_MS of silence, as before. One that looks unfinished,
 * as when the visitor stops mid-sentence to find a word, waits up to HOLD_MS, and what they say
 * next joins the same line. The words are the final text of each transcription socket, which
 * comes about 200 ms after the socket ends; the live deltas lag the voice by up to a second.
 *
 * When a socket ended mid-sentence, realtime STT wrote no closing punctuation ("I am looking for
 * a", "J'ai la peau sèche, donc"), an ellipsis ("My skin is...", "Je cherche une crème qui..."), or
 * a full stop or question mark after a filler or a connecting word ("I am looking for um.", "Je
 * voudrais une crème pour.", "Cream with?"): 20 of 20 such clips. 45 of 49 whole answers ended
 * with . ? or ! (TTS voices, probe of 2026-10-06).
 */

import { END_MS } from "@/lib/speech-gate";

/** Silence that ends a line that looks unfinished. */
export const HOLD_MS = 1_800;

/**
 * Fillers, and words that lead into the rest of a sentence, in English then French. "so" and "for"
 * are left out: whole answers end with them ("Yes, I think so.", "That is what I am looking for."),
 * and STT left the cut sentences unpunctuated ("dry, so", "I need something for"). "to" stays,
 * since STT wrote "I would like to." for a cut sentence, so "I'd love to." waits. "que" is there
 * because STT writes "parce que".
 */
const LEADING_WORDS = new Set([
  ...["and", "or", "but", "because", "the", "a", "an", "with", "to", "of", "my", "like", "um", "uh", "er"],
  ...["et", "ou", "mais", "donc", "parce", "que", "le", "la", "les", "un", "une", "de", "des", "du"],
  ...["pour", "avec", "mon", "ma", "euh", "bah"],
]);

/** Whether the visitor seems to have stopped mid-sentence. */
export function looksUnfinished(text: string): boolean {
  const said = text.trim();
  if (!/[.?!]$/.test(said) || said.endsWith("...")) return true; // "…" is not [.?!] either
  // Hyphens stay inside words, so "ajoutez-la." does not end on "la".
  const lastWord = said.toLowerCase().match(/[\p{L}\p{N}'-]+/gu)?.at(-1) ?? "";
  return LEADING_WORDS.has(lastWord);
}

/** The silence that ends a line whose words so far are `text`. */
export function endAfterMs(text: string): number {
  return looksUnfinished(text) ? HOLD_MS : END_MS;
}
