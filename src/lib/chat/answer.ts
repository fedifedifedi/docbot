import { NOT_FOUND_ANSWER } from "@/lib/llm/prompt";
import type { LLMProvider } from "@/lib/llm/provider";
import type { SearchHit } from "@/lib/search/search";
import { citedRefs, isNotFoundAnswer } from "./citations";

export const MAX_QUESTION_LENGTH = 1000;
const EXCERPT_PREVIEW_LENGTH = 300;

/** Snapshot of a cited chunk, stored with the message so history survives document deletion. */
export type Source = {
  ref: number;
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  excerpt: string;
};

export type ChatAnswer = {
  answer: string;
  sources: Source[];
  /** The documentation does not contain the answer. */
  notFound: boolean;
};

export type AnswerDeps = {
  search: (question: string) => Promise<SearchHit[]>;
  llm: LLMProvider;
};

function preview(content: string): string {
  const flat = content.replace(/\s+/g, " ").trim();
  return flat.length > EXCERPT_PREVIEW_LENGTH ? `${flat.slice(0, EXCERPT_PREVIEW_LENGTH - 1)}…` : flat;
}

const notFound = (): ChatAnswer => ({ answer: NOT_FOUND_ANSWER, sources: [], notFound: true });

/**
 * Question → full-text search → (guard) → LLM → cited sources (SPEC F5).
 *
 * Guard: when no chunk matches, the bot says so **without calling the LLM**, so it cannot
 * invent anything. When the LLM itself says the excerpts do not answer, no source is shown.
 */
export async function answerQuestion(question: string, deps: AnswerDeps): Promise<ChatAnswer> {
  const hits = await deps.search(question);
  if (hits.length === 0) return notFound();

  const answer = (
    await deps.llm.generateAnswer({
      question,
      excerpts: hits.map((hit, i) => ({
        ref: i + 1,
        documentTitle: hit.documentTitle,
        content: hit.content,
      })),
    })
  ).trim();
  if (!answer || isNotFoundAnswer(answer)) return notFound();

  // Sources are the cited excerpts; if the model cited nothing, all excerpts it was given.
  const cited = citedRefs(answer, hits.length);
  const refs = cited.length > 0 ? cited : hits.map((_, i) => i + 1);
  const sources = refs.map((ref) => {
    const hit = hits[ref - 1];
    return {
      ref,
      documentId: hit.documentId,
      documentTitle: hit.documentTitle,
      chunkIndex: hit.chunkIndex,
      excerpt: preview(hit.content),
    };
  });
  return { answer, sources, notFound: false };
}
