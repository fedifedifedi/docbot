import { describe, expect, it } from "vitest";
import { cosineSimilarity } from "@/lib/embeddings/embedder";
import {
  filterBySimilarity,
  hybridSearch,
  parseSearchMode,
  reciprocalRankFusion,
  RRF_K,
  type HybridDeps,
  type Passage,
  type VectorHit,
} from "@/lib/search/hybrid";
import type { SearchHit } from "@/lib/search/search";
import { fakeEmbedder, fakeVector } from "../../helpers/fake-embedder";

const base = (id: string) => ({
  chunkId: id,
  documentId: "doc",
  documentTitle: "Protocole",
  chunkIndex: Number(id.replace(/\D/g, "")) || 0,
  content: `contenu ${id}`,
});
const text = (id: string, rank = 0.1): SearchHit => ({ ...base(id), rank });
const vec = (id: string, similarity: number): VectorHit => ({ ...base(id), similarity });

describe("parseSearchMode", () => {
  it("defaults to fulltext", () => {
    expect(parseSearchMode(undefined)).toBe("fulltext");
    expect(parseSearchMode("")).toBe("fulltext");
  });

  it("accepts hybrid", () => {
    expect(parseSearchMode("hybrid")).toBe("hybrid");
  });

  it("refuses an unknown value instead of silently picking a mode", () => {
    expect(() => parseSearchMode("vector")).toThrow(/fulltext, hybrid/);
  });
});

describe("filterBySimilarity", () => {
  it("keeps results at or above the threshold", () => {
    const hits = [vec("a", 0.9), vec("b", 0.85), vec("c", 0.849)];
    expect(filterBySimilarity(hits, 0.85).map((h) => h.chunkId)).toEqual(["a", "b"]);
  });
});

describe("reciprocalRankFusion", () => {
  it("scores each item with the sum of 1 / (k + rank)", () => {
    const fused = reciprocalRankFusion<Passage>([[text("a"), text("b")], [vec("b", 0.9)]]);
    expect(fused.map((f) => f.item.chunkId)).toEqual(["b", "a"]);
    expect(fused[0].score).toBeCloseTo(1 / (RRF_K + 2) + 1 / (RRF_K + 1));
    expect(fused[1].score).toBeCloseTo(1 / (RRF_K + 1));
  });

  it("puts an item found by both searches above items found by only one", () => {
    const fused = reciprocalRankFusion<Passage>([
      [text("a"), text("b"), text("c")],
      [vec("x", 0.9), vec("c", 0.88)],
    ]);
    expect(fused[0].item.chunkId).toBe("c");
  });

  it("keeps the first list's order on ties, deterministically", () => {
    const fused = reciprocalRankFusion<Passage>([[text("a")], [vec("x", 0.9)]]);
    expect(fused.map((f) => f.item.chunkId)).toEqual(["a", "x"]);
  });

  it("returns nothing for empty lists", () => {
    expect(reciprocalRankFusion<Passage>([[], []])).toEqual([]);
  });
});

describe("hybridSearch", () => {
  const options = { limit: 5, candidates: 20, minSimilarity: 0.85 };
  const deps = (textHits: SearchHit[], vectorHits: VectorHit[]): HybridDeps => ({
    fulltext: async () => textHits,
    vector: async () => vectorHits,
  });

  it("finds a passage that only the vector search sees (synonym)", async () => {
    const hits = await hybridSearch("pacemaker ?", deps([], [vec("stimulateur", 0.88)]), options);
    expect(hits.map((h) => h.chunkId)).toEqual(["stimulateur"]);
  });

  it("returns nothing for an off-topic question: no text match and vectors under the threshold", async () => {
    const hits = await hybridSearch("cafétéria ?", deps([], [vec("a", 0.8), vec("b", 0.79)]), options);
    expect(hits).toEqual([]);
  });

  it("keeps the top `limit` passages, without duplicates", async () => {
    const textHits = ["1", "2", "3", "4"].map((id) => text(id));
    const vectorHits = ["3", "5", "6", "7"].map((id) => vec(id, 0.9));
    const hits = await hybridSearch("q", deps(textHits, vectorHits), { ...options, limit: 5 });
    expect(hits).toHaveLength(5);
    expect(new Set(hits.map((h) => h.chunkId)).size).toBe(5);
    expect(hits[0].chunkId).toBe("3"); // found by both
  });

  it("asks each search for `candidates` results, in parallel", async () => {
    const calls: string[] = [];
    let running = 0;
    let maxRunning = 0;
    const track = async <T,>(name: string, limit: number, result: T) => {
      calls.push(`${name}:${limit}`);
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running--;
      return result;
    };
    await hybridSearch(
      "q",
      {
        fulltext: (_q, limit) => track("fulltext", limit, [] as SearchHit[]),
        vector: (_q, limit) => track("vector", limit, [] as VectorHit[]),
      },
      options,
    );
    expect(calls.sort()).toEqual(["fulltext:20", "vector:20"]);
    expect(maxRunning).toBe(2);
  });

  it("returns the fused score as rank, best first", async () => {
    const hits = await hybridSearch("q", deps([text("a")], [vec("a", 0.9)]), options);
    expect(hits[0].rank).toBeCloseTo(2 / (RRF_K + 1));
  });
});

describe("fake embedder (deterministic stand-in for the model)", () => {
  it("gives the same normalized vector for the same text", async () => {
    const [a, b] = await fakeEmbedder.embedPassages(["Grossesse et examen", "Grossesse et examen"]);
    expect(a).toEqual(b);
    expect(Math.hypot(...a)).toBeCloseTo(1);
  });

  it("brings texts that share words closer than unrelated ones", () => {
    const query = fakeVector("fonction rénale avant injection");
    const related = fakeVector("vérifier la fonction rénale du patient avant l'injection");
    const unrelated = fakeVector("cafétéria au rez-de-chaussée");
    expect(cosineSimilarity(query, related)).toBeGreaterThan(cosineSimilarity(query, unrelated));
  });
});
