import "server-only";
import { getDb } from "@/lib/db";
import type { Embedder } from "@/lib/embeddings/embedder";
import { localEmbedder } from "@/lib/embeddings/local";
import { saveChunkEmbeddings } from "@/lib/embeddings/store";
import { getEnv } from "@/lib/env";
import { chunkText } from "./chunk";
import type { DocumentInput } from "./input";

export type CreateDocumentOptions = {
  /** Computes chunk embeddings; `null` skips them. Defaults to the local model in hybrid mode. */
  embedder?: Embedder | null;
};

function defaultEmbedder(): Embedder | null {
  return getEnv().SEARCH_MODE === "hybrid" ? localEmbedder : null;
}

/**
 * Stores a document and its chunks atomically. With an embedder, the chunk embeddings are
 * computed first (a model failure stores nothing) and written in the same transaction.
 */
export async function createDocument(input: DocumentInput, options: CreateDocumentOptions = {}) {
  const chunks = chunkText(input.content);
  if (chunks.length === 0) throw new Error("Document has no indexable content");

  const embedder = options.embedder === undefined ? defaultEmbedder() : options.embedder;
  const vectors = embedder ? await embedder.embedPassages(chunks) : null;

  const document = await getDb().$transaction(async (tx) => {
    const created = await tx.document.create({
      data: {
        title: input.title,
        source: input.source,
        filename: input.filename,
        content: input.content,
        // One multi-row INSERT instead of one per chunk (a 1 MB file is ~1,300 chunks).
        chunks: { createMany: { data: chunks.map((content, index) => ({ index, content })) } },
      },
      select: { id: true },
    });
    if (vectors) {
      const rows = await tx.chunk.findMany({
        where: { documentId: created.id },
        orderBy: { index: "asc" },
        select: { id: true, index: true },
      });
      await saveChunkEmbeddings(tx, rows.map((row) => ({ id: row.id, vector: vectors[row.index] })));
    }
    return created;
  });
  return { id: document.id, chunkCount: chunks.length };
}

export function listDocuments() {
  return getDb().document.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      source: true,
      filename: true,
      createdAt: true,
      _count: { select: { chunks: true } },
    },
  });
}

export function getDocumentWithChunks(id: string) {
  return getDb().document.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      source: true,
      filename: true,
      createdAt: true,
      chunks: { orderBy: { index: "asc" }, select: { id: true, index: true, content: true } },
    },
  });
}

/** Deletes a document; its chunks go with it (ON DELETE CASCADE). Returns false if absent. */
export async function deleteDocument(id: string): Promise<boolean> {
  const { count } = await getDb().document.deleteMany({ where: { id } });
  return count > 0;
}
