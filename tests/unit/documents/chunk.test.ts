import { describe, expect, it } from "vitest";
import { chunkText, DEFAULT_CHUNK_OPTIONS, normalizeText } from "@/lib/documents/chunk";

function paragraph(seed: string, length: number): string {
  const words: string[] = [];
  let i = 0;
  while (words.join(" ").length < length) words.push(`${seed}${i++}`);
  return `${words.join(" ")}.`;
}

describe("normalizeText", () => {
  it("normalizes line endings, BOM, tabs, trailing spaces and blank lines", () => {
    expect(normalizeText("﻿a\r\nb  \r\n\r\n\r\n\r\n\tc\rd")).toBe("a\nb\n\n c\nd");
  });

  it("returns an empty string for whitespace only", () => {
    expect(normalizeText(" \n\n\t \r\n ")).toBe("");
  });
});

describe("chunkText", () => {
  it("returns no chunk for empty or blank text", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n\n  ")).toEqual([]);
  });

  it("keeps a short document in a single chunk", () => {
    const text = "Le support est ouvert de 9h à 18h.\n\nIl est fermé le week-end.";
    expect(chunkText(text)).toEqual([text]);
  });

  it("is deterministic", () => {
    const text = Array.from({ length: 12 }, (_, i) => paragraph(`p${i}w`, 300)).join("\n\n");
    expect(chunkText(text)).toEqual(chunkText(text));
  });

  it("packs paragraphs up to the target size without cutting them", () => {
    const paragraphs = Array.from({ length: 6 }, (_, i) => paragraph(`p${i}w`, 300));
    const chunks = chunkText(paragraphs.join("\n\n"));

    expect(chunks.length).toBeGreaterThan(1);
    for (const p of paragraphs) {
      expect(chunks.some((chunk) => chunk.includes(p))).toBe(true);
    }
  });

  it("never exceeds the maximum size and never produces empty chunks", () => {
    const text = [
      "# Titre",
      paragraph("a", 2500),
      paragraph("b", 90),
      "x".repeat(3000), // one giant "word"
      "## Section",
      paragraph("c", 5000),
    ].join("\n\n");

    const chunks = chunkText(text);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(DEFAULT_CHUNK_OPTIONS.maxSize);
      expect(chunk.trim()).not.toBe("");
    }
  });

  it("splits an oversized paragraph on sentence boundaries", () => {
    const sentences = Array.from(
      { length: 40 },
      (_, i) => `Phrase numéro ${i} avec un peu de contenu pour la remplir.`,
    );
    const chunks = chunkText(sentences.join(" "));

    expect(chunks.length).toBeGreaterThan(1);
    for (const sentence of sentences) {
      expect(chunks.some((chunk) => chunk.includes(sentence))).toBe(true);
    }
  });

  it("starts a new chunk at each Markdown heading and repeats the heading in its chunks", () => {
    const text = [
      "# Horaires",
      "Le support est ouvert de 9h à 18h.",
      "## Tarifs",
      paragraph("tarif", 1500),
    ].join("\n\n");

    const chunks = chunkText(text);
    expect(chunks[0]).toBe("# Horaires\n\nLe support est ouvert de 9h à 18h.");
    const tarifChunks = chunks.slice(1);
    expect(tarifChunks.length).toBeGreaterThan(1);
    for (const chunk of tarifChunks) expect(chunk.startsWith("## Tarifs\n\n")).toBe(true);
    expect(chunks.some((chunk) => chunk.includes("Horaires") && chunk.includes("tarif"))).toBe(false);
  });

  it("cuts an oversized paragraph around the target size, not the maximum", () => {
    const chunks = chunkText(paragraph("w", 5000));
    // Every chunk but the last stays close to the target (overlap included).
    for (const chunk of chunks.slice(0, -1)) {
      expect(chunk.length).toBeLessThanOrEqual(
        DEFAULT_CHUNK_OPTIONS.targetSize + DEFAULT_CHUNK_OPTIONS.overlap + 2,
      );
    }
  });

  it("handles a heading directly followed by text (no blank line)", () => {
    expect(chunkText("# FAQ\nQuestion fréquente.")).toEqual(["# FAQ\n\nQuestion fréquente."]);
  });

  it("overlaps consecutive chunks of the same section", () => {
    const paragraphs = Array.from({ length: 6 }, (_, i) => paragraph(`p${i}w`, 400));
    const chunks = chunkText(paragraphs.join("\n\n"));

    expect(chunks.length).toBeGreaterThan(1);
    for (let i = 1; i < chunks.length; i++) {
      const previousEnd = chunks[i - 1].slice(-40);
      expect(chunks[i]).toContain(previousEnd);
    }
  });

  it("does not carry overlap across sections", () => {
    const chunks = chunkText(`# A\n\n${paragraph("alpha", 500)}\n\n# B\n\nbeta`);
    expect(chunks.at(-1)).toBe("# B\n\nbeta");
  });

  it("keeps a document made only of headings", () => {
    expect(chunkText("# Un\n\n## Deux")).toEqual(["# Un\n## Deux"]);
  });

  it("respects custom options", () => {
    const chunks = chunkText(paragraph("w", 1000), { targetSize: 200, maxSize: 300, overlap: 0 });
    expect(chunks.length).toBeGreaterThanOrEqual(4);
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(300);
  });

  it("rejects inconsistent options", () => {
    expect(() => chunkText("x", { targetSize: 500, maxSize: 100 })).toThrow();
  });
});
