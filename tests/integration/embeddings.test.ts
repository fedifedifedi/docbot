import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { createDocument } from "@/lib/documents/service";
import { backfillEmbeddings } from "@/lib/embeddings/backfill";
import type { Embedder } from "@/lib/embeddings/embedder";
import { vectorSearch } from "@/lib/search/semantic";
import { fakeEmbedder } from "../helpers/fake-embedder";
import { resetContent } from "./db";

// Real PostgreSQL + pgvector, deterministic fake model (no download, no network).

const addDoc = (title: string, content: string, embedder: Embedder | null) =>
  createDocument({ title, content, source: "PASTE", filename: null }, { embedder });

async function embeddingCounts() {
  const [row] = await getDb().$queryRaw<{ total: number; embedded: number }[]>`
    SELECT count(*)::int AS total, count(embedding)::int AS embedded FROM chunks
  `;
  return row;
}

beforeEach(resetContent);
afterAll(async () => {
  await resetContent();
  await getDb().$disconnect();
});

describe("chunk embeddings (pgvector)", () => {
  it("are computed and stored with the document when an embedder is given", async () => {
    await addDoc("Grossesse", "## Grossesse\n\nToute patiente est interrogée sur une éventuelle grossesse.", fakeEmbedder);
    expect(await embeddingCounts()).toEqual({ total: 1, embedded: 1 });
  });

  it("are skipped without an embedder (fulltext mode)", async () => {
    await addDoc("Jeûne", "Le patient est à jeun depuis six heures.", null);
    expect(await embeddingCounts()).toEqual({ total: 1, embedded: 0 });
  });

  it("store nothing at all if the model fails (no half-indexed document)", async () => {
    const broken: Embedder = { ...fakeEmbedder, embedPassages: async () => Promise.reject(new Error("model")) };
    await expect(addDoc("Cassé", "Texte", broken)).rejects.toThrow("model");
    expect(await getDb().document.count()).toBe(0);
  });
});

describe("backfillEmbeddings", () => {
  it("fills only the missing embeddings, batch by batch, and is idempotent", async () => {
    await addDoc("A", "## Un\n\nPremier sujet.\n\n## Deux\n\nDeuxième sujet.\n\n## Trois\n\nTroisième sujet.", null);
    await addDoc("B", "Déjà calculé.", fakeEmbedder);
    const progress: number[] = [];

    expect(await backfillEmbeddings(getDb(), fakeEmbedder, { batchSize: 2, onProgress: (n) => progress.push(n) })).toBe(3);
    expect(progress).toEqual([2, 3]);
    expect(await embeddingCounts()).toEqual({ total: 4, embedded: 4 });
    expect(await backfillEmbeddings(getDb(), fakeEmbedder)).toBe(0);
  });
});

describe("vectorSearch", () => {
  it("returns the closest chunks first, with their cosine similarity", async () => {
    await addDoc(
      "Protocole",
      "## Fonction rénale\n\nVérifier la fonction rénale avant une injection de contraste.\n\n## Cafétéria\n\nLa cafétéria est au rez-de-chaussée.",
      fakeEmbedder,
    );
    const hits = await vectorSearch("fonction rénale avant injection", 5, fakeEmbedder);

    expect(hits).toHaveLength(2);
    expect(hits[0].content).toContain("Fonction rénale");
    expect(hits[0].similarity).toBeGreaterThan(hits[1].similarity);
    expect(hits[0].similarity).toBeLessThanOrEqual(1);
    expect(hits[0]).toMatchObject({ documentTitle: "Protocole", chunkIndex: 0 });
  });

  it("ignores chunks that have no embedding", async () => {
    await addDoc("Sans vecteur", "Vérifier la fonction rénale.", null);
    expect(await vectorSearch("fonction rénale", 5, fakeEmbedder)).toEqual([]);
  });

  it("respects the limit", async () => {
    await addDoc("Long", ["## A\n\nun", "## B\n\ndeux", "## C\n\ntrois"].join("\n\n"), fakeEmbedder);
    expect(await vectorSearch("un deux trois", 2, fakeEmbedder)).toHaveLength(2);
  });
});
