import { describe, expect, it, vi } from "vitest";
import { answerQuestion } from "@/lib/chat/answer";
import { NOT_FOUND_ANSWER } from "@/lib/llm/prompt";
import type { LLMProvider } from "@/lib/llm/provider";
import type { SearchHit } from "@/lib/search/search";

function hit(n: number, overrides: Partial<SearchHit> = {}): SearchHit {
  return {
    chunkId: `c${n}`,
    documentId: `d${n}`,
    documentTitle: `Doc ${n}`,
    chunkIndex: 0,
    content: `Contenu ${n}`,
    rank: 1 / n,
    ...overrides,
  };
}

function llmReturning(answer: string) {
  const generateAnswer = vi.fn(async () => answer);
  return { provider: { name: "fake", generateAnswer } satisfies LLMProvider, generateAnswer };
}

describe("answerQuestion", () => {
  it("refuses without calling the LLM when nothing matches", async () => {
    const { provider, generateAnswer } = llmReturning("inventé");
    const result = await answerQuestion("Prix ?", { search: async () => [], llm: provider });

    expect(result).toEqual({ answer: NOT_FOUND_ANSWER, sources: [], notFound: true });
    expect(generateAnswer).not.toHaveBeenCalled();
  });

  it("passes numbered excerpts to the LLM and returns the cited sources only", async () => {
    const { provider, generateAnswer } = llmReturning("Réponse [2].");
    const result = await answerQuestion("Q ?", { search: async () => [hit(1), hit(2)], llm: provider });

    expect(generateAnswer).toHaveBeenCalledWith({
      question: "Q ?",
      excerpts: [
        { ref: 1, documentTitle: "Doc 1", content: "Contenu 1" },
        { ref: 2, documentTitle: "Doc 2", content: "Contenu 2" },
      ],
    });
    expect(result.notFound).toBe(false);
    expect(result.sources).toEqual([
      { ref: 2, documentId: "d2", documentTitle: "Doc 2", chunkIndex: 0, excerpt: "Contenu 2" },
    ]);
  });

  it("falls back to every excerpt given when the answer cites nothing", async () => {
    const { provider } = llmReturning("Réponse sans citation.");
    const result = await answerQuestion("Q ?", { search: async () => [hit(1), hit(2)], llm: provider });
    expect(result.sources.map((s) => s.ref)).toEqual([1, 2]);
  });

  it("shows no source when the LLM says the excerpts do not answer", async () => {
    const { provider } = llmReturning(` ${NOT_FOUND_ANSWER} `);
    const result = await answerQuestion("Q ?", { search: async () => [hit(1)], llm: provider });
    expect(result).toEqual({ answer: NOT_FOUND_ANSWER, sources: [], notFound: true });
  });

  it("treats an empty LLM answer as not found", async () => {
    const { provider } = llmReturning("   ");
    const result = await answerQuestion("Q ?", { search: async () => [hit(1)], llm: provider });
    expect(result.notFound).toBe(true);
  });

  it("shortens long excerpts in sources", async () => {
    const { provider } = llmReturning("R [1].");
    const long = "mot ".repeat(200);
    const result = await answerQuestion("Q ?", {
      search: async () => [hit(1, { content: long })],
      llm: provider,
    });
    expect(result.sources[0].excerpt.length).toBeLessThanOrEqual(300);
    expect(result.sources[0].excerpt.endsWith("…")).toBe(true);
  });

  it("propagates provider errors", async () => {
    const provider: LLMProvider = {
      name: "broken",
      generateAnswer: async () => {
        throw new Error("down");
      },
    };
    await expect(
      answerQuestion("Q ?", { search: async () => [hit(1)], llm: provider }),
    ).rejects.toThrow("down");
  });
});
