import { describe, expect, it } from "vitest";
import { parseStoredSources } from "@/lib/chat/sources";

const valid = { ref: 1, documentId: "d1", documentTitle: "Support", chunkIndex: 0, excerpt: "9h-18h" };

describe("parseStoredSources", () => {
  it("returns the stored sources", () => {
    expect(parseStoredSources([valid])).toEqual([valid]);
  });

  it("returns an empty list for null or non-array JSON", () => {
    expect(parseStoredSources(null)).toEqual([]);
    expect(parseStoredSources({ ref: 1 })).toEqual([]);
    expect(parseStoredSources("oops")).toEqual([]);
  });

  it("keeps valid entries and skips malformed ones", () => {
    expect(parseStoredSources([valid, { ref: "x" }, null])).toEqual([valid]);
  });
});
