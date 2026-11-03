/**
 * What the app needs from an embedding model. The real implementation (Transformers.js) and
 * the deterministic fake used by tests both implement it; the rest of the code only sees this.
 */
export interface Embedder {
  /** Vector of a user question. */
  embedQuery(text: string): Promise<number[]>;
  /** Vectors of document chunks, in the same order. */
  embedPassages(texts: string[]): Promise<number[][]>;
}

/**
 * E5 models are trained with these prefixes: "query: " for what is searched, "passage: " for
 * what is stored. Omitting them noticeably lowers retrieval quality.
 */
export const toQueryInput = (text: string) => `query: ${text}`;
export const toPassageInput = (text: string) => `passage: ${text}`;

/** Cosine similarity; for normalized vectors it is just the dot product. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error(`Vector sizes differ: ${a.length} vs ${b.length}`);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na === 0 || nb === 0 ? 0 : dot / Math.sqrt(na * nb);
}
