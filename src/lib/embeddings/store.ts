import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { toVectorLiteral } from "./vector";

type Db = Pick<PrismaClient, "$executeRaw" | "$queryRaw">;

/** Writes the embeddings of several chunks in one UPDATE (parameterized arrays). */
export async function saveChunkEmbeddings(db: Db, rows: { id: string; vector: number[] }[]): Promise<number> {
  if (rows.length === 0) return 0;
  const ids = rows.map((row) => row.id);
  const literals = rows.map((row) => toVectorLiteral(row.vector));
  return db.$executeRaw`
    UPDATE chunks AS c
    SET embedding = v.embedding::vector
    FROM (SELECT unnest(${ids}::text[]) AS id, unnest(${literals}::text[]) AS embedding) AS v
    WHERE c.id = v.id
  `;
}

/** Chunks that still have no embedding (documents indexed in fulltext mode, older data). */
export function chunksWithoutEmbedding(db: Db, limit: number) {
  return db.$queryRaw<{ id: string; content: string }[]>`
    SELECT id, content FROM chunks WHERE embedding IS NULL ORDER BY document_id, index LIMIT ${limit}
  `;
}
