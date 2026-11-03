import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import type { Embedder } from "./embedder";
import { chunksWithoutEmbedding, saveChunkEmbeddings } from "./store";

/**
 * Computes the missing chunk embeddings (documents indexed in fulltext mode, or before this
 * feature), batch by batch. Idempotent: run it again and it only does what is left.
 */
export async function backfillEmbeddings(
  db: Pick<PrismaClient, "$executeRaw" | "$queryRaw">,
  embedder: Embedder,
  { batchSize = 32, onProgress }: { batchSize?: number; onProgress?: (done: number) => void } = {},
): Promise<number> {
  let done = 0;
  for (;;) {
    const batch = await chunksWithoutEmbedding(db, batchSize);
    if (batch.length === 0) return done;
    const vectors = await embedder.embedPassages(batch.map((chunk) => chunk.content));
    await saveChunkEmbeddings(db, batch.map((chunk, i) => ({ id: chunk.id, vector: vectors[i] })));
    done += batch.length;
    onProgress?.(done);
  }
}
