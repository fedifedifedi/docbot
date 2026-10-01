export const MAX_SEARCH_TERMS = 24;
export const MAX_TERM_LENGTH = 64;

/**
 * Words PostgreSQL's `french` stop list keeps but that only add noise to an OR query:
 * "les" (missing from that list, unlike "le"/"la" — found by the integration tests),
 * interrogatives and politeness formulas typical of chat questions.
 */
const QUESTION_STOP_WORDS = new Set(
  (
    "les quel quels quelle quelles comment combien pourquoi quand où est-ce qu'est-ce " +
    "peut peux pouvez puis faut dois doit savoir dire bonjour merci svp stp " +
    "voudrais aimerais souhaite cherche"
  ).split(" "),
);

/**
 * Extracts candidate search words from a natural-language question.
 *
 * Only letters and digits survive, so nothing from the question can be interpreted as
 * tsquery syntax. Stemming, accents and most stop words are handled by PostgreSQL
 * (`docbot_fr` configuration); this cleans and bounds the input.
 */
export function extractSearchTerms(question: string): string[] {
  const words = question.normalize("NFC").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const terms = new Set<string>();
  for (const word of words) {
    if (word.length < 2 && !/\p{N}/u.test(word)) continue; // drop "l", "d", "s"… but keep digits
    if (QUESTION_STOP_WORDS.has(word)) continue;
    terms.add(word.slice(0, MAX_TERM_LENGTH));
    if (terms.size === MAX_SEARCH_TERMS) break;
  }
  return [...terms];
}
