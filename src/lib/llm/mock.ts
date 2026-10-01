import { NOT_FOUND_ANSWER } from "./prompt";
import type { GenerateAnswerInput, LLMProvider } from "./provider";

const STOP_WORDS = new Set(
  (
    "les des une est sont quel quels quelle quelles qui que quoi comment combien pourquoi " +
    "cette ces mon mes ton tes son ses notre nos votre vos leur leurs nous vous ils elles " +
    "dans par pour sur avec sans pas plus aux est-ce peut peux puis dois doit faut faire " +
    "fait avez ont existe-t-il bonjour merci svp moi toi lui eux tout tous toute toutes"
  ).split(/\s+/),
);

/** Fraction of the question's keywords the selected sentences must cover. */
const MIN_COVERAGE = 0.5;
const MAX_SENTENCES = 2;

function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function words(text: string): string[] {
  return fold(text).match(/[\p{L}\p{N}]+/gu) ?? [];
}

/** Crude French "stem": a word prefix, enough to match horaire/horaires, ouvert/ouverte. */
function stem(word: string): string {
  return word.length > 4 ? word.slice(0, Math.max(4, word.length - 2)) : word;
}

export function questionKeywords(question: string): string[] {
  return [...new Set(words(question).filter((w) => w.length >= 3 && !STOP_WORDS.has(w)).map(stem))];
}

function splitSentences(content: string): string[] {
  return content
    .split("\n")
    .filter((line) => !/^#{1,6}\s/.test(line)) // headings are context, not answers
    .join("\n")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Deterministic, offline stand-in for an LLM. It behaves like a careful model would:
 * answers only with sentences taken from the excerpts, cites them, and says it does not
 * know when the excerpts do not cover the question's keywords well enough.
 */
export class MockLLMProvider implements LLMProvider {
  readonly name = "mock";

  async generateAnswer({ question, excerpts }: GenerateAnswerInput): Promise<string> {
    const keywords = questionKeywords(question);
    if (keywords.length === 0) return NOT_FOUND_ANSWER;

    const candidates = excerpts.flatMap((excerpt) =>
      splitSentences(excerpt.content).map((text, position) => {
        const sentenceWords = words(text);
        const matched = keywords.filter((k) => sentenceWords.some((w) => w.startsWith(k)));
        return { text, ref: excerpt.ref, position, matched };
      }),
    );

    const selected = candidates
      .filter((c) => c.matched.length > 0)
      .sort((a, b) => b.matched.length - a.matched.length || a.ref - b.ref || a.position - b.position)
      .slice(0, MAX_SENTENCES);

    const covered = new Set(selected.flatMap((c) => c.matched));
    if (covered.size / keywords.length < MIN_COVERAGE) return NOT_FOUND_ANSWER;

    return selected.map((c) => `${c.text} [${c.ref}]`).join(" ");
  }
}
