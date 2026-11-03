/**
 * Hybrid search logic (pure: the two searches are injected, no database or model here).
 *
 * Full-text and vector search are run side by side, weak vector results are dropped below a
 * similarity threshold, and both rankings are merged with Reciprocal Rank Fusion (RRF).
 */
import type { SearchHit } from "./search";

export const SEARCH_MODES = ["fulltext", "hybrid"] as const;
export type SearchMode = (typeof SEARCH_MODES)[number];

/** RRF constant from Cormack et al. (2009): damps the weight of the very first ranks. */
export const RRF_K = 60;

/** A chunk as both searches return it, without its search-specific score. */
export type Passage = Omit<SearchHit, "rank">;

/** A vector search result: cosine similarity between the question and the chunk (−1 to 1). */
export type VectorHit = Passage & { similarity: number };

export type HybridDeps = {
  fulltext: (question: string, limit: number) => Promise<SearchHit[]>;
  vector: (question: string, limit: number) => Promise<VectorHit[]>;
};

export type HybridOptions = {
  /** Passages returned after fusion (top-k). */
  limit: number;
  /** Passages taken from each search before fusion. */
  candidates: number;
  /** Vector results strictly below this similarity are ignored. */
  minSimilarity: number;
  k?: number;
};

/** Keeps the vector results at or above the similarity threshold (off-topic guard). */
export function filterBySimilarity(hits: VectorHit[], minSimilarity: number): VectorHit[] {
  return hits.filter((hit) => hit.similarity >= minSimilarity);
}

/**
 * Reciprocal Rank Fusion: score(chunk) = Σ 1 / (k + rank), over the lists it appears in
 * (rank starts at 1). Only ranks are used, so scores of different natures (ts_rank_cd,
 * cosine similarity) never have to be compared. Ties keep the order of the first list.
 */
export function reciprocalRankFusion<T extends { chunkId: string }>(
  rankings: T[][],
  k: number = RRF_K,
): { item: T; score: number }[] {
  const fused = new Map<string, { item: T; score: number; order: number }>();
  let order = 0;
  for (const ranking of rankings) {
    ranking.forEach((item, index) => {
      const entry = fused.get(item.chunkId) ?? { item, score: 0, order: order++ };
      entry.score += 1 / (k + index + 1);
      fused.set(item.chunkId, entry);
    });
  }
  return [...fused.values()]
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map(({ item, score }) => ({ item, score }));
}

/** Runs both searches, drops weak vector results, fuses with RRF and keeps the top `limit`. */
export async function hybridSearch(
  question: string,
  deps: HybridDeps,
  { limit, candidates, minSimilarity, k = RRF_K }: HybridOptions,
): Promise<SearchHit[]> {
  const [textHits, vectorHits] = await Promise.all([
    deps.fulltext(question, candidates),
    deps.vector(question, candidates),
  ]);
  const relevantVectorHits = filterBySimilarity(vectorHits, minSimilarity);
  return reciprocalRankFusion<Passage>([textHits, relevantVectorHits], k)
    .slice(0, limit)
    .map(({ item, score }) => ({
      chunkId: item.chunkId,
      documentId: item.documentId,
      documentTitle: item.documentTitle,
      chunkIndex: item.chunkIndex,
      content: item.content,
      rank: score,
    }));
}
