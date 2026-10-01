import { describe, expect, it } from "vitest";
import { citedRefs, isNotFoundAnswer } from "@/lib/chat/citations";
import { NOT_FOUND_ANSWER } from "@/lib/llm/prompt";

describe("citedRefs", () => {
  it("returns cited excerpt numbers in order of first appearance", () => {
    expect(citedRefs("Ouvert de 9h à 18h [2]. Fermé le week-end [1][2].", 3)).toEqual([2, 1]);
  });

  it("accepts comma-separated citations", () => {
    expect(citedRefs("Voir [1, 3].", 3)).toEqual([1, 3]);
  });

  it("ignores numbers outside the excerpt range", () => {
    expect(citedRefs("Selon [0], [4] et [2].", 3)).toEqual([2]);
  });

  it("returns nothing without citations", () => {
    expect(citedRefs("Pas de citation ici (2024).", 3)).toEqual([]);
  });
});

describe("isNotFoundAnswer", () => {
  it("recognizes the sentence, with quotes, accents or punctuation variations", () => {
    expect(isNotFoundAnswer(NOT_FOUND_ANSWER)).toBe(true);
    expect(isNotFoundAnswer(`"${NOT_FOUND_ANSWER}"`)).toBe(true);
    expect(isNotFoundAnswer("je ne trouve pas cette information dans la documentation")).toBe(true);
  });

  it("does not flag a real answer that mentions a missing detail", () => {
    expect(
      isNotFoundAnswer(`Le support ouvre à 9h [1]. ${NOT_FOUND_ANSWER} pour le samedi.`),
    ).toBe(false);
  });
});
