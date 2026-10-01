/**
 * Splits a document into chunks for full-text search (SPEC F3).
 *
 * - Paragraphs (blank-line separated) are packed into chunks of ~`targetSize` chars.
 * - Markdown headings start a new section; every chunk of a section starts with its
 *   heading, so a chunk stays understandable (and searchable) on its own.
 * - A paragraph that does not fit is split by sentences, then by words as a last resort.
 * - Consecutive chunks of the same section share ~`overlap` chars so an answer is not
 *   lost at a boundary. No chunk exceeds `maxSize`.
 *
 * Pure and deterministic: no I/O.
 */

export type ChunkOptions = {
  targetSize: number;
  maxSize: number;
  overlap: number;
};

export const DEFAULT_CHUNK_OPTIONS: ChunkOptions = {
  targetSize: 800,
  maxSize: 1200,
  overlap: 100,
};

const HEADING = /^#{1,6}\s+\S/;
const MAX_HEADING_LENGTH = 200;
const SEPARATOR = "\n\n";

type Section = { heading: string | null; blocks: string[] };

export function normalizeText(text: string): string {
  return text
    .replace(/^﻿/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, " ")
    .split("\n")
    .map((line) => line.replace(/[  ]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toSections(text: string): Section[] {
  const sections: Section[] = [{ heading: null, blocks: [] }];
  for (const paragraph of text.split(/\n{2,}/)) {
    const lines = paragraph.split("\n");
    // Headings may be directly followed by text, without a blank line.
    while (lines.length > 0 && HEADING.test(lines[0])) {
      const heading = lines.shift()!.trim().slice(0, MAX_HEADING_LENGTH);
      sections.push({ heading, blocks: [] });
    }
    const block = lines.join("\n").trim();
    if (block) sections[sections.length - 1].blocks.push(block);
  }
  return sections;
}

/** Greedily packs `parts` (joined with `joiner`) into pieces of at most `size` chars. */
function pack(parts: string[], size: number, joiner: string): string[] {
  const pieces: string[] = [];
  let current = "";
  for (const part of parts) {
    const candidate = current ? current + joiner + part : part;
    if (candidate.length <= size) {
      current = candidate;
    } else {
      if (current) pieces.push(current);
      current = part;
    }
  }
  if (current) pieces.push(current);
  return pieces;
}

function splitWords(text: string, size: number): string[] {
  const words = text.split(/\s+/).flatMap((word) => {
    // A single "word" longer than the budget (e.g. a URL) is cut as is.
    const slices: string[] = [];
    for (let i = 0; i < word.length; i += size) slices.push(word.slice(i, i + size));
    return slices;
  });
  return pack(words, size, " ");
}

function splitOversized(block: string, size: number): string[] {
  const sentences = block
    .split(/(?<=[.!?…])\s+/)
    .flatMap((sentence) => (sentence.length > size ? splitWords(sentence, size) : [sentence]));
  return pack(sentences, size, " ");
}

/** End of `text`, at most `size` chars, starting on a word boundary. */
function tail(text: string, size: number): string {
  if (size <= 0) return "";
  if (text.length <= size) return text;
  const end = text.slice(-size);
  const space = end.search(/\s/);
  return space >= 0 ? end.slice(space + 1) : end;
}

function chunkSection(section: Section, options: ChunkOptions): string[] {
  const prefix = section.heading ? section.heading + SEPARATOR : "";
  // Room left for content once the heading and the overlap are accounted for.
  const budget = Math.max(
    100,
    options.maxSize - prefix.length - options.overlap - SEPARATOR.length,
  );
  // Oversized paragraphs are cut to the target size, not to the hard limit.
  const pieceSize = Math.max(100, Math.min(budget, options.targetSize - prefix.length));

  const chunks: string[] = [];
  let parts: string[] = [];
  let hasNewContent = false;

  const render = (items: string[]) => prefix + items.join(SEPARATOR);
  const flush = () => {
    if (!hasNewContent) return;
    chunks.push(render(parts));
    const carried = tail(parts[parts.length - 1], options.overlap);
    parts = carried ? [carried] : [];
    hasNewContent = false;
  };

  for (const block of section.blocks) {
    const pieces = block.length > budget ? splitOversized(block, pieceSize) : [block];
    for (const piece of pieces) {
      if (hasNewContent && render([...parts, piece]).length > options.targetSize) flush();
      parts.push(piece);
      hasNewContent = true;
    }
  }
  flush();
  return chunks;
}

export function chunkText(text: string, options: Partial<ChunkOptions> = {}): string[] {
  const opts = { ...DEFAULT_CHUNK_OPTIONS, ...options };
  if (opts.targetSize > opts.maxSize) throw new Error("targetSize must be <= maxSize");

  const normalized = normalizeText(text);
  if (!normalized) return [];

  const sections = toSections(normalized);
  const chunks = sections.flatMap((section) => chunkSection(section, opts));

  // A document made only of headings still yields something searchable.
  if (chunks.length === 0) {
    return pack(
      sections.flatMap((s) => (s.heading ? [s.heading] : [])),
      opts.maxSize,
      "\n",
    );
  }
  return chunks;
}
