import type { Embedder } from "@/lib/embeddings/embedder";
import { EMBEDDING_DIMENSIONS } from "@/lib/embeddings/config";

/**
 * Deterministic stand-in for the embedding model (no download, no network): each word is
 * hashed into one of the 384 dimensions, so texts sharing words get close vectors. It does
 * not understand meaning; it only exercises the plumbing (storage, ranking, threshold).
 */
function words(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 2);
}

function hash(word: string): number {
  let h = 2166136261; // FNV-1a
  for (let i = 0; i < word.length; i++) h = Math.imul(h ^ word.charCodeAt(i), 16777619);
  return (h >>> 0) % EMBEDDING_DIMENSIONS;
}

export function fakeVector(text: string): number[] {
  const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  for (const word of words(text)) vector[hash(word)] += 1;
  const norm = Math.hypot(...vector);
  return norm === 0 ? vector : vector.map((x) => x / norm);
}

export const fakeEmbedder: Embedder = {
  embedQuery: async (text) => fakeVector(text),
  embedPassages: async (texts) => texts.map(fakeVector),
};
