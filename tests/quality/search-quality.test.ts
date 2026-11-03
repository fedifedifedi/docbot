import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { createDocument } from "@/lib/documents/service";
import { localEmbedder } from "@/lib/embeddings/local";
import { judge } from "@/lib/search/evaluation";
import { searchWithConfig, type SearchConfig } from "@/lib/search/search";
import { DEMO_DOCUMENT, readDemoDocument } from "../../fixtures/demo/document";
import { REFERENCE_QUESTIONS, type ReferenceQuestion } from "../../fixtures/demo/questions";

// Real model (Transformers.js, local files) + local PostgreSQL with pgvector.

const FULLTEXT: SearchConfig = { mode: "fulltext", abbreviations: false };
const HYBRID: SearchConfig = { mode: "hybrid", abbreviations: false };
const HYBRID_DICT: SearchConfig = { mode: "hybrid", abbreviations: true };

const byId = (id: string) => REFERENCE_QUESTIONS.find((q) => q.id === id)!;

async function verdict(config: SearchConfig, q: ReferenceQuestion) {
  const hits = await searchWithConfig(config, q.question);
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
    const result = await verdict(HYBRID, byId(id));
    expect(result.passed, result.obtained).toBe(true);
  });

  it("Q3 (IDM) without the dictionary is refused rather than answered with a wrong section", async () => {
    expect((await verdict(HYBRID, byId("Q3"))).hits).toEqual([]);
  });

  it("Q3 (IDM) finds the infarction section first with the abbreviation dictionary", async () => {
    const result = await verdict(HYBRID_DICT, byId("Q3"));
    expect(result.passed, result.obtained).toBe(true);
  });

  it("Q6 (off-topic) still yields zero passages, so the bot refuses without the LLM", async () => {
    expect((await verdict(HYBRID, byId("Q6"))).hits).toEqual([]);
    expect((await verdict(HYBRID_DICT, byId("Q6"))).hits).toEqual([]);
  });
});

describe("no regression between configurations", () => {
  it.each(REFERENCE_QUESTIONS.map((q) => q.id))("%s: hybrid ≥ full-text, and dictionary ≥ hybrid", async (id) => {
    const q = byId(id);
    const fulltext = await verdict(FULLTEXT, q);
    const hybrid = await verdict(HYBRID, q);
    const withDict = await verdict(HYBRID_DICT, q);
    if (fulltext.passed) expect(hybrid.passed, `hybrid: ${hybrid.obtained}`).toBe(true);
    if (hybrid.passed) expect(withDict.passed, `hybrid + dictionary: ${withDict.obtained}`).toBe(true);
  });

  it("no off-topic question gets a passage from the vector side (similarity threshold)", async () => {
    for (const q of REFERENCE_QUESTIONS.filter((question) => question.expected === null)) {
      const fulltext = await verdict(FULLTEXT, q);
      for (const config of [HYBRID, HYBRID_DICT]) {
        // Whatever hybrid returns for an off-topic question must come from full-text alone.
        expect((await verdict(config, q)).hits.length, q.id).toBeLessThanOrEqual(fulltext.hits.length);
      }
    }
  });
});
