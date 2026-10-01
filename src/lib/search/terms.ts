export const MAX_SEARCH_TERMS = 24;
export const MAX_TERM_LENGTH = 64;

/**
 * Extracts candidate search words from a natural-language question.
 *
 * Only letters and digits survive, so nothing from the question can be interpreted as
 * tsquery syntax. Stop words, stemming and accents are handled by PostgreSQL
 * (`docbot_fr` configuration); this only bounds and cleans the input.
 */
export function extractSearchTerms(question: string): string[] {
  const words = question.normalize("NFC").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const terms = new Set<string>();
  for (const word of words) {
    if (word.length < 2 && !/\p{N}/u.test(word)) continue; // drop "l", "d", "s"… but keep digits
    terms.add(word.slice(0, MAX_TERM_LENGTH));
    if (terms.size === MAX_SEARCH_TERMS) break;
  }
  return [...terms];
}
