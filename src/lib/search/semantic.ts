import "server-only";
import { getDb } from "@/lib/db";
import type { Embedder } from "@/lib/embeddings/embedder";
import { localEmbedder } from "@/lib/embeddings/local";
import { toVectorLiteral } from "@/lib/embeddings/vector";
import type { VectorHit } from "./hybrid";

/**
 * Vector search: the chunks closest in meaning to the question (cosine distance, HNSW index).
 * `similarity` = 1 − cosine distance. Chunks without an embedding are skipped.
 */
export async function vectorSearch(
  question: string,
  limit: number,
  embedder: Embedder = localEmbedder,
): Promise<VectorHit[]> {
  const query = toVectorLiteral(await embedder.embedQuery(question));
  const rows = await getDb().$queryRaw<VectorHit[]>`
    SELECT
      c.id AS "chunkId",
      c.document_id AS "documentId",
      d.title AS "documentTitle",
      c.index AS "chunkIndex",
      c.content,
      (1 - (c.embedding <=> ${query}::vector))::float8 AS similarity
    FROM chunks c
    JOIN documents d ON d.id = c.document_id
    WHERE c.embedding IS NOT NULL
    ORDER BY c.embedding <=> ${query}::vector
    LIMIT ${limit}
  `;
  return rows.map((row) => ({ ...row, similarity: Number(row.similarity) }));
}
