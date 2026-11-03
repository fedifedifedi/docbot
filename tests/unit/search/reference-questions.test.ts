import { describe, expect, it } from "vitest";
import { chunkText } from "@/lib/documents/chunk";
import { readDemoDocument } from "../../../fixtures/demo/document";
import { REFERENCE_QUESTIONS } from "../../../fixtures/demo/questions";

// Guards the evaluation itself: each expected phrase must identify exactly one section.
describe("reference questions", () => {
  const chunks = chunkText(readDemoDocument());

  it("have unique ids", () => {
    const ids = REFERENCE_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(REFERENCE_QUESTIONS.filter((q) => q.expected))("$id: the expected phrase is in exactly one chunk, its section", (q) => {
    const matching = chunks.filter((chunk) => chunk.includes(q.expected!.phrase));
    expect(matching).toHaveLength(1);
    expect(matching[0].startsWith(`## ${q.expected!.section}\n`)).toBe(true);
  });

  it("include off-topic questions that must be refused", () => {
    expect(REFERENCE_QUESTIONS.filter((q) => q.expected === null).length).toBeGreaterThanOrEqual(2);
  });
});
