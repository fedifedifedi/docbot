import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { answerQuestion } from "@/lib/chat/answer";
import { getDb } from "@/lib/db";
import { createDocument } from "@/lib/documents/service";
import { MockLLMProvider } from "@/lib/llm/mock";
import { NOT_FOUND_ANSWER } from "@/lib/llm/prompt";
import { searchChunks } from "@/lib/search/search";
import { resetContent } from "./db";

/** Same wiring as POST /api/chat with LLM_PROVIDER=mock: real PostgreSQL search + mock LLM. */
const deps = { search: searchChunks, llm: new MockLLMProvider() };

beforeEach(resetContent);
afterAll(async () => {
  await resetContent();
  await getDb().$disconnect();
});

describe("answerQuestion with real search and the mock provider", () => {
  it("answers « Quel est le délai de livraison ? » from a Livraison document, with its source", async () => {
    await createDocument({
      title: "Livraison",
      content:
        "# Livraison\n\nLe délai de livraison est de 3 à 5 jours ouvrés en France métropolitaine. " +
        "La livraison est offerte dès 50 € d'achat.\n\n## Retours\n\nLes retours sont acceptés sous 30 jours.",
      source: "PASTE",
      filename: null,
    });

    const result = await answerQuestion("Quel est le délai de livraison ?", deps);

    expect(result.notFound).toBe(false);
    expect(result.answer).toContain("Le délai de livraison est de 3 à 5 jours ouvrés");
    expect(result.answer).toMatch(/\[1\]/);
    expect(result.sources.map((s) => s.documentTitle)).toEqual(["Livraison"]);
  });

  it("refuses, without sources, when no document mentions it", async () => {
    await createDocument({
      title: "Support",
      content: "Le support est ouvert de 9h à 18h.",
      source: "PASTE",
      filename: null,
    });

    expect(await answerQuestion("Quel est le délai de livraison ?", deps)).toEqual({
      answer: NOT_FOUND_ANSWER,
      sources: [],
      notFound: true,
    });
  });
});
