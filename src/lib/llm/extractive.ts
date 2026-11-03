import { cosineSimilarity, type Embedder } from "@/lib/embeddings/embedder";
import { expandAbbreviations } from "@/lib/search/abbreviations";
import { NOT_FOUND_ANSWER } from "./prompt";
import { LLMError, type GenerateAnswerInput, type LLMProvider } from "./provider";

/**
 * Extractive answers, local and free: instead of generating text, it quotes the sentences of
 * the retrieved excerpts that are closest in MEANING to the question (same embedding model as
 * the search), cites them [n], and refuses when no sentence is close enough. Nothing is
 * written that is not in the documentation.
 */

export type Sentence = {
  ref: number;
  /** Order inside its excerpt (ties keep document order). */
  position: number;
  /** Heading of the excerpt's section, used as context when scoring. */
  heading: string | null;
  text: string;
};

export type ScoredSentence = Sentence & { similarity: number };

export const DEFAULT_MAX_SENTENCES = 2;

/** Sentences of an excerpt; Markdown headings are kept apart, as context for the scoring. */
export function splitIntoSentences(ref: number, content: string): Sentence[] {
  const heading = content.match(/^#{1,6}\s+(.+)$/m)?.[1]?.trim() ?? null;
  return content
    .split("\n")
    .filter((line) => !/^#{1,6}\s/.test(line))
    .join("\n")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text, position) => ({ ref, position, heading, text }));
}

/** Text that gets embedded for a sentence: its section heading gives the missing context. */
export function sentenceForScoring(sentence: Sentence): string {
  return sentence.heading ? `${sentence.heading}. ${sentence.text}` : sentence.text;
}

/**
 * Keeps the sentences at or above `minSimilarity`, best first, at most `max`. Pure: the
 * similarities are already computed.
 */
export function selectSentences(scored: ScoredSentence[], minSimilarity: number, max: number): ScoredSentence[] {
  return scored
    .filter((sentence) => sentence.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity || a.ref - b.ref || a.position - b.position)
    .slice(0, max);
}

/**
 * Quoted sentences with their citation, e.g. « Les examens… dans l'heure. [1] », put back in
 * document order so the answer reads like the protocol (selection is by similarity).
 */
export function formatAnswer(selected: Sentence[]): string {
  if (selected.length === 0) return NOT_FOUND_ANSWER;
  return [...selected]
    .sort((a, b) => a.ref - b.ref || a.position - b.position)
    .map((s) => `${s.text} [${s.ref}]`)
    .join(" ");
}

export type ExtractiveOptions = {
  embedder: Embedder;
  /** Sentences under this cosine similarity with the question are never quoted. */
  minSimilarity: number;
  /** Apply the medical abbreviation dictionary to the question before comparing. */
  abbreviations: boolean;
  maxSentences?: number;
};

/** Scores every sentence of the excerpts against the question, with the embedding model. */
export async function scoreSentences(
  question: string,
  excerpts: GenerateAnswerInput["excerpts"],
  { embedder, abbreviations }: Pick<ExtractiveOptions, "embedder" | "abbreviations">,
): Promise<ScoredSentence[]> {
  const sentences = excerpts.flatMap((excerpt) => splitIntoSentences(excerpt.ref, excerpt.content));
  if (sentences.length === 0) return [];
  const [query, vectors] = await Promise.all([
    embedder.embedQuery(abbreviations ? expandAbbreviations(question) : question),
    embedder.embedPassages(sentences.map(sentenceForScoring)),
  ]);
  return sentences.map((sentence, i) => ({ ...sentence, similarity: cosineSimilarity(query, vectors[i]) }));
}

export class ExtractiveProvider implements LLMProvider {
  readonly name = "extractive";

  constructor(private readonly options: ExtractiveOptions) {}

  /**
   * Quotes only from the FIRST excerpt, the one the search ranked best: scoring the sentences
   * of every excerpt would redo the search sentence by sentence, and worse — measured on the
   * reference questions, it picked a sentence from the wrong section for « pacemaker », and no
   * threshold separated good from bad quotes (margin −0.031, vs +0.030 with the first excerpt).
   */
  async generateAnswer({ question, excerpts }: GenerateAnswerInput): Promise<string> {
    let scored: ScoredSentence[];
    try {
      scored = await scoreSentences(question, excerpts.slice(0, 1), this.options);
    } catch (error) {
      throw new LLMError("Extractive provider: embedding model failed", { cause: error });
    }
    const max = this.options.maxSentences ?? DEFAULT_MAX_SENTENCES;
    return formatAnswer(selectSentences(scored, this.options.minSimilarity, max));
  }
}
