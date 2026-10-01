import "server-only";
import { getDb } from "@/lib/db";
import { chunkText } from "./chunk";
import type { DocumentInput } from "./input";

/** Stores a document and its chunks atomically. */
export async function createDocument(input: DocumentInput) {
  const chunks = chunkText(input.content);
  if (chunks.length === 0) throw new Error("Document has no indexable content");

  const document = await getDb().document.create({
    data: {
      title: input.title,
      source: input.source,
      filename: input.filename,
      content: input.content,
      chunks: { create: chunks.map((content, index) => ({ index, content })) },
    },
    select: { id: true },
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
