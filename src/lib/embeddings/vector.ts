import { EMBEDDING_DIMENSIONS } from "./config";

/**
 * pgvector text format: "[0.1,0.2,...]". Values are checked so only finite numbers of the
 * right count reach SQL (sent as a query parameter, never concatenated into SQL).
 */
export function toVectorLiteral(vector: number[]): string {
  if (vector.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Expected ${EMBEDDING_DIMENSIONS} dimensions, got ${vector.length}`);
  }
  if (!vector.every(Number.isFinite)) throw new Error("Vector contains a non-finite value");
  return `[${vector.join(",")}]`;
}
