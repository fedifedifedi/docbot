import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { createDocument } from "@/lib/documents/service";
import { localEmbedder } from "@/lib/embeddings/local";
import { judge } from "@/lib/search/evaluation";
import { searchWithMode } from "@/lib/search/search";
import { DEMO_DOCUMENT, readDemoDocument } from "../../fixtures/demo/document";
import { REFERENCE_QUESTIONS, type ReferenceQuestion } from "../../fixtures/demo/questions";

// Real model (Transformers.js, local files) + local PostgreSQL with pgvector.

const byId = (id: string) => REFERENCE_QUESTIONS.find((q) => q.id === id)!;

async function verdict(mode: "fulltext" | "hybrid", q: ReferenceQuestion) {
  const hits = await searchWithMode(mode, q.question);
  return { hits, ...judge(q.expected && { documentTitle: DEMO_DOCUMENT.title, phrase: q.expected.phrase }, hits) };
}

beforeAll(async () => {
  // Fresh copy of the demo document, embedded with the real model.
  await getDb().document.deleteMany({ where: { title: DEMO_DOCUMENT.title } });
  await createDocument(
    { title: DEMO_DOCUMENT.title, content: readDemoDocument(), source: "FILE", filename: DEMO_DOCUMENT.filename },
    { embedder: localEmbedder },
  );
});

afterAll(() => getDb().$disconnect());

describe("hybrid search, real model — acceptance questions", () => {
  it.each(["Q1", "Q2", "Q4", "Q5"])("%s finds the right section first", async (id) => {
    const result = await verdict("hybrid", byId(id));
    expect(result.passed, result.obtained).toBe(true);
  });

  // Known limitation: the model does not link the abbreviation IDM to « infarctus du
  // myocarde ». Expected to pass once the medical abbreviation dictionary is added.
  it.fails("Q3 (IDM) finds the infarction section first", async () => {
    const result = await verdict("hybrid", byId("Q3"));
    expect(result.passed, result.obtained).toBe(true);
  });

  it("Q3 (IDM) is refused rather than answered with a wrong section", async () => {
    expect((await verdict("hybrid", byId("Q3"))).hits).toEqual([]);
  });

  it("Q6 (off-topic) still yields zero passages, so the bot refuses without the LLM", async () => {
    expect((await verdict("hybrid", byId("Q6"))).hits).toEqual([]);
  });
});

describe("hybrid search, real model — never worse than full-text", () => {
  it.each(REFERENCE_QUESTIONS.map((q) => q.id))("%s: hybrid passes whenever full-text passes", async (id) => {
    const q = byId(id);
    const [fulltext, hybrid] = [await verdict("fulltext", q), await verdict("hybrid", q)];
    if (fulltext.passed) expect(hybrid.passed, `hybrid: ${hybrid.obtained}`).toBe(true);
  });

  it("no off-topic question gets a passage from the vector side (similarity threshold)", async () => {
    for (const q of REFERENCE_QUESTIONS.filter((question) => question.expected === null)) {
      const [fulltext, hybrid] = [await verdict("fulltext", q), await verdict("hybrid", q)];
      // Whatever hybrid returns for an off-topic question must come from full-text alone.
      expect(hybrid.hits.length, q.id).toBeLessThanOrEqual(fulltext.hits.length);
    }
  });
});
