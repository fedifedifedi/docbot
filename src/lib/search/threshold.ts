/**
 * Where a vector-similarity threshold can go, from measured scores (pure).
 *
 * - Off-topic questions must yield no passage: the threshold must be ABOVE the best
 *   similarity any chunk reaches for them (`floor`).
 * - Answerable questions must keep their right chunk: the threshold must be AT MOST the
 *   similarity of that chunk (`ceiling`).
 * A valid threshold exists only if floor < ceiling; the gap is the safety margin.
 */
export type ThresholdWindow = {
  /** Highest similarity reached by an off-topic question (threshold must be above it). */
  floor: number;
  /** Lowest similarity of a right chunk (threshold must be at most it). */
  ceiling: number;
  /** ceiling − floor: negative means no threshold separates the two groups. */
  margin: number;
  /** Middle of the window, or null when there is none. */
  suggested: number | null;
};

export function thresholdWindow(rightChunkSimilarities: number[], offTopicBestSimilarities: number[]): ThresholdWindow {
  if (rightChunkSimilarities.length === 0 || offTopicBestSimilarities.length === 0) {
    throw new Error("Need at least one answerable and one off-topic question");
  }
  const floor = Math.max(...offTopicBestSimilarities);
  const ceiling = Math.min(...rightChunkSimilarities);
  const margin = ceiling - floor;
  return { floor, ceiling, margin, suggested: margin > 0 ? (floor + ceiling) / 2 : null };
}
