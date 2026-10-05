/** A typed address worth sending: something@domain.tld, without spaces. The backend checks it again. */
const ADDRESS = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)*\.[a-z]{2,}$/i;

/** Whether the visitor's typed text looks like an email address (spec 006). */
export function looksLikeEmail(text: string): boolean {
  return ADDRESS.test(text.trim());
}
