import { describe, expect, it } from "vitest";
import { chunkText } from "@/lib/documents/chunk";
import { readDemoDocument } from "../../../fixtures/demo/document";

// The search evaluation is only meaningful if each topic is its own chunk.
describe("demo imaging protocol", () => {
  const chunks = chunkText(readDemoDocument());
  const sections = chunks.filter((chunk) => chunk.startsWith("## "));

  it("gives one chunk per section: an introduction and 10 topics", () => {
    expect(chunks).toHaveLength(11);
    expect(sections).toHaveLength(10);
  });

  it("never mixes two topics in one chunk", () => {
    for (const chunk of chunks) expect(chunk.match(/^## /gm)?.length ?? 0).toBeLessThanOrEqual(1);
  });
});
