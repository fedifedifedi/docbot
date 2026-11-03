import { describe, expect, it } from "vitest";
import { EMBEDDING_DIMENSIONS } from "@/lib/embeddings/config";
import { toVectorLiteral } from "@/lib/embeddings/vector";

const vector = (value: number) => new Array<number>(EMBEDDING_DIMENSIONS).fill(value);

describe("toVectorLiteral", () => {
  it("formats a vector the way pgvector reads it", () => {
    const literal = toVectorLiteral([0.5, -0.25, ...vector(0).slice(2)]);
    expect(literal.startsWith("[0.5,-0.25,0,")).toBe(true);
    expect(literal.endsWith(",0]")).toBe(true);
  });

  it("refuses a vector of the wrong size", () => {
    expect(() => toVectorLiteral([1, 2, 3])).toThrow(/384 dimensions/);
  });

  it("refuses NaN or infinite values", () => {
    expect(() => toVectorLiteral([Number.NaN, ...vector(0).slice(1)])).toThrow(/non-finite/);
    expect(() => toVectorLiteral([Infinity, ...vector(0).slice(1)])).toThrow(/non-finite/);
  });
});
