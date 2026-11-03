import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { answerQuestion } from "@/lib/chat/answer";
import { getDb } from "@/lib/db";
import { createDocument } from "@/lib/documents/service";
import { localEmbedder } from "@/lib/embeddings/local";
import { DEFAULT_EXTRACTIVE_MIN_SIMILARITY } from "@/lib/env";
import { ExtractiveProvider } from "@/lib/llm/extractive";
import { searchWithConfig } from "@/lib/search/search";
import { DEMO_DOCUMENT, readDemoDocument } from "../../fixtures/demo/document";
import { REFERENCE_QUESTIONS } from "../../fixtures/demo/questions";

// The whole chat pipeline as configured for the demo: hybrid search + abbreviation dictionary,
// then the extractive provider, with the real model on the local database.

const llm = new ExtractiveProvider({
  embedder: localEmbedder,
  minSimilarity: DEFAULT_EXTRACTIVE_MIN_SIMILARITY,
  abbreviations: true,
});
const search = (question: string) => searchWithConfig({ mode: "hybrid", abbreviations: true }, question);
const ask = (id: string) => answerQuestion(REFERENCE_QUESTIONS.find((q) => q.id === id)!.question, { search, llm });

beforeAll(async () => {
  await getDb().document.deleteMany({ where: { title: DEMO_DOCUMENT.title } });
  await createDocument(
    { title: DEMO_DOCUMENT.title, content: readDemoDocument(), source: "FILE", filename: DEMO_DOCUMENT.filename },
    { embedder: localEmbedder },
  );
});

afterAll(() => getDb().$disconnect());

describe("extractive provider, real model — demo questions", () => {
  it.each(["Q1", "Q2", "Q3", "Q4", "Q5", "Q7"])("%s is answered with sentences quoted from the right section", async (id) => {
    const q = REFERENCE_QUESTIONS.find((question) => question.id === id)!;
    const result = await ask(id);
    expect(result.notFound, result.answer).toBe(false);
    expect(result.sources[0].documentTitle).toBe(DEMO_DOCUMENT.title);
    expect(result.sources[0].excerpt).toContain(q.expected!.section);
    expect(result.answer).toMatch(/\[1\]/);
  });

  it("Q3 (IDM): two sentences in document order, the second completing the first", async () => {
    const { answer } = await ask("Q3");
    const sentences = answer.split(/(?<=\[1\])\s+/);
    expect(sentences).toHaveLength(2);
    expect(sentences[0]).toMatch(/^En cas de suspicion d'infarctus du myocarde.*pris en charge en urgence par l'équipe de cardiologie\. \[1\]$/);
    expect(sentences[1]).toBe("Une IRM cardiaque peut être programmée secondairement, sur demande du cardiologue. [1]");
  });

  it("refuses when the search put a wrong section first (Q8, Q9) or matched an off-topic word (Q15, Q16)", async () => {
    for (const id of ["Q8", "Q9", "Q15", "Q16"]) {
      const result = await ask(id);
      expect(result.notFound, `${id}: ${result.answer}`).toBe(true);
      expect(result.sources, id).toEqual([]);
    }
  });

  it("never answers an off-topic question", async () => {
    for (const q of REFERENCE_QUESTIONS.filter((question) => question.expected === null)) {
      expect((await ask(q.id)).notFound, q.id).toBe(true);
    }
  });
});
