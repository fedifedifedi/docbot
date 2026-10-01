import { describe, expect, it } from "vitest";
import { MockLLMProvider, questionKeywords } from "@/lib/llm/mock";
import { NOT_FOUND_ANSWER } from "@/lib/llm/prompt";

const llm = new MockLLMProvider();

const excerpts = [
  {
    ref: 1,
    documentTitle: "Support",
    content:
      "## Horaires\n\nLes horaires du support sont de 9h à 18h du lundi au vendredi. Le support est fermé le week-end.",
  },
  { ref: 2, documentTitle: "Tarifs", content: "Le forfait de base coûte 49 € par mois." },
];

describe("MockLLMProvider", () => {
  it("answers with the best matching sentences and cites them", async () => {
    const answer = await llm.generateAnswer({
      question: "Quels sont les horaires du support ?",
      excerpts,
    });
    expect(answer).toContain("Les horaires du support sont de 9h à 18h du lundi au vendredi. [1]");
    expect(answer).not.toContain("## Horaires");
  });

  it("says it does not know when the question's keywords are not covered", async () => {
    const answer = await llm.generateAnswer({
      question: "Quel est le prix du forfait entreprise ?",
      excerpts,
    });
    expect(answer).toBe(NOT_FOUND_ANSWER);
  });

  it("matches accents and plurals loosely", async () => {
    const answer = await llm.generateAnswer({ question: "support ferme ?", excerpts });
    expect(answer).toContain("Le support est fermé le week-end. [1]");
  });

  it("is deterministic", async () => {
    const input = { question: "horaires du support", excerpts };
    expect(await llm.generateAnswer(input)).toBe(await llm.generateAnswer(input));
  });

  it("does not know when there are no excerpts or no keywords", async () => {
    expect(await llm.generateAnswer({ question: "horaires", excerpts: [] })).toBe(NOT_FOUND_ANSWER);
    expect(await llm.generateAnswer({ question: "et le ?", excerpts })).toBe(NOT_FOUND_ANSWER);
  });
});

describe("questionKeywords", () => {
  it("drops stop words and short words, folds accents", () => {
    expect(questionKeywords("Quels sont les horaires de l'équipe ?")).toEqual(["horair", "equi"]);
  });
});
