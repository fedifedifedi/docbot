import { describe, expect, it } from "vitest";
import { extractSearchTerms, MAX_SEARCH_TERMS } from "@/lib/search/terms";

describe("extractSearchTerms", () => {
  it("keeps the words of a natural-language question, lower-cased", () => {
    expect(extractSearchTerms("Quels sont les horaires du Support ?")).toEqual([
      "quels",
      "sont",
      "les",
      "horaires",
      "du",
      "support",
    ]);
  });

  it("splits elisions and hyphens, drops one-letter fragments but keeps digits", () => {
    expect(extractSearchTerms("L'horaire d'ouverture du week-end à 9h ? 3")).toEqual([
      "horaire",
      "ouverture",
      "du",
      "week",
      "end",
      "9h",
      "3",
    ]);
  });

  it("keeps accents (PostgreSQL folds them)", () => {
    expect(extractSearchTerms("fermé")).toEqual(["fermé"]);
  });

  it("strips every tsquery operator so input cannot inject query syntax", () => {
    expect(extractSearchTerms("a' | b & !c <-> (d) :* 'e'")).toEqual([]);
    for (const term of extractSearchTerms("foo|bar&baz!qux(x):*")) {
      expect(term).toMatch(/^[\p{L}\p{N}]+$/u);
    }
  });

  it("deduplicates and bounds the number of terms", () => {
    expect(extractSearchTerms("prix prix PRIX")).toEqual(["prix"]);
    const many = Array.from({ length: 100 }, (_, i) => `mot${i}`).join(" ");
    expect(extractSearchTerms(many)).toHaveLength(MAX_SEARCH_TERMS);
  });

  it("returns nothing for punctuation only", () => {
    expect(extractSearchTerms(" ?!… ")).toEqual([]);
  });
});
