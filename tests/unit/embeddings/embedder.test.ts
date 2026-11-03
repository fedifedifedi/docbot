import { describe, expect, it } from "vitest";
import { cosineSimilarity, toPassageInput, toQueryInput } from "@/lib/embeddings/embedder";

describe("E5 prefixes", () => {
  it("marks questions and stored passages differently", () => {
    expect(toQueryInput("pacemaker et IRM ?")).toBe("query: pacemaker et IRM ?");
    expect(toPassageInput("## IRM et stimulateur cardiaque")).toBe("passage: ## IRM et stimulateur cardiaque");
  });
});

describe("cosineSimilarity", () => {
  it("is 1 for the same direction, 0 for orthogonal vectors, -1 for opposite ones", () => {
    expect(cosineSimilarity([1, 2], [2, 4])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 3])).toBeCloseTo(0);
    expect(cosineSimilarity([1, 1], [-1, -1])).toBeCloseTo(-1);
  });

  it("is 0 with a zero vector instead of NaN", () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });

  it("refuses vectors of different sizes", () => {
    expect(() => cosineSimilarity([1, 2, 3], [1, 2])).toThrow(/sizes differ/);
  });
});
