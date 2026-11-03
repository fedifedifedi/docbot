import { describe, expect, it } from "vitest";
import type { Embedder } from "@/lib/embeddings/embedder";
import {
  ExtractiveProvider,
  formatAnswer,
  selectSentences,
  sentenceForScoring,
  splitIntoSentences,
  type ScoredSentence,
} from "@/lib/llm/extractive";
import { NOT_FOUND_ANSWER } from "@/lib/llm/prompt";
import { LLMError } from "@/lib/llm/provider";
import { fakeEmbedder } from "../../helpers/fake-embedder";

const GROSSESSE =
  "## Grossesse et examens irradiants\n\nToute patiente est interrogée sur une éventuelle grossesse. En cas de doute, un test est proposé.";

const scored = (text: string, similarity: number, ref = 1, position = 0): ScoredSentence => ({
  ref,
  position,
  heading: null,
  text,
  similarity,
});

describe("splitIntoSentences", () => {
  it("splits sentences and keeps the section heading apart, as context", () => {
    expect(splitIntoSentences(2, GROSSESSE)).toEqual([
      { ref: 2, position: 0, heading: "Grossesse et examens irradiants", text: "Toute patiente est interrogée sur une éventuelle grossesse." },
      { ref: 2, position: 1, heading: "Grossesse et examens irradiants", text: "En cas de doute, un test est proposé." },
    ]);
  });

  it("works without a heading", () => {
    expect(splitIntoSentences(1, "Une phrase. Une autre !")).toEqual([
      { ref: 1, position: 0, heading: null, text: "Une phrase." },
      { ref: 1, position: 1, heading: null, text: "Une autre !" },
    ]);
  });
});

describe("sentenceForScoring", () => {
  it("prefixes the sentence with its heading so it keeps its meaning", () => {
    const [first] = splitIntoSentences(1, GROSSESSE);
    expect(sentenceForScoring(first)).toBe("Grossesse et examens irradiants. Toute patiente est interrogée sur une éventuelle grossesse.");
  });
});

describe("selectSentences", () => {
  it("keeps sentences at or above the threshold, best first, at most `max`", () => {
    const picked = selectSentences([scored("a", 0.8), scored("b", 0.9), scored("c", 0.85), scored("d", 0.7)], 0.8, 2);
    expect(picked.map((s) => s.text)).toEqual(["b", "c"]);
  });

  it("returns nothing when no sentence is close enough", () => {
    expect(selectSentences([scored("a", 0.79)], 0.8, 2)).toEqual([]);
  });

  it("breaks ties by excerpt then position (document order)", () => {
    const picked = selectSentences([scored("b", 0.9, 2, 0), scored("a2", 0.9, 1, 1), scored("a1", 0.9, 1, 0)], 0, 3);
    expect(picked.map((s) => s.text)).toEqual(["a1", "a2", "b"]);
  });
});

describe("formatAnswer", () => {
  it("quotes the sentences with their citation", () => {
    expect(formatAnswer([scored("Compte rendu dans l'heure.", 0.9, 1), scored("Sous 48 heures.", 0.88, 2)])).toBe(
      "Compte rendu dans l'heure. [1] Sous 48 heures. [2]",
    );
  });

  it("puts the sentences back in document order, whatever their score", () => {
    const second = scored("Puis une IRM peut être programmée.", 0.9, 1, 1);
    const first = scored("Le patient est pris en charge en urgence.", 0.85, 1, 0);
    expect(formatAnswer([second, first])).toBe("Le patient est pris en charge en urgence. [1] Puis une IRM peut être programmée. [1]");
  });

  it("is the exact refusal sentence when nothing is selected", () => {
    expect(formatAnswer([])).toBe(NOT_FOUND_ANSWER);
  });
});

describe("ExtractiveProvider (fake model, no network)", () => {
  const excerpts = [{ ref: 1, documentTitle: "Protocole", content: GROSSESSE }];

  it("quotes the sentence closest to the question and cites it", async () => {
    const provider = new ExtractiveProvider({ embedder: fakeEmbedder, minSimilarity: 0.1, abbreviations: false, maxSentences: 1 });
    expect(await provider.generateAnswer({ question: "éventuelle grossesse patiente", excerpts })).toBe(
      "Toute patiente est interrogée sur une éventuelle grossesse. [1]",
    );
  });

  it("quotes only from the first (best-ranked) excerpt", async () => {
    const provider = new ExtractiveProvider({ embedder: fakeEmbedder, minSimilarity: 0, abbreviations: false });
    const answer = await provider.generateAnswer({
      question: "cantine repas gluten",
      excerpts: [...excerpts, { ref: 2, documentTitle: "Autre", content: "La cantine propose des repas sans gluten." }],
    });
    expect(answer).not.toContain("[2]");
    expect(answer).toContain("[1]");
  });

  it("quotes at most two sentences by default", async () => {
    const content = "Une phrase un. Une phrase deux. Une phrase trois.";
    const provider = new ExtractiveProvider({ embedder: fakeEmbedder, minSimilarity: 0, abbreviations: false });
    const answer = await provider.generateAnswer({ question: "phrase", excerpts: [{ ref: 1, documentTitle: "D", content }] });
    expect(answer.match(/\[1\]/g)).toHaveLength(2);
  });

  it("refuses with the exact sentence when no sentence reaches the threshold", async () => {
    const provider = new ExtractiveProvider({ embedder: fakeEmbedder, minSimilarity: 0.99, abbreviations: false });
    expect(await provider.generateAnswer({ question: "cantine sans gluten", excerpts })).toBe(NOT_FOUND_ANSWER);
  });

  it("applies the abbreviation dictionary to the question when enabled", async () => {
    const queries: string[] = [];
    const spy: Embedder = { ...fakeEmbedder, embedQuery: async (text) => (queries.push(text), fakeEmbedder.embedQuery(text)) };
    for (const abbreviations of [false, true]) {
      await new ExtractiveProvider({ embedder: spy, minSimilarity: 0, abbreviations }).generateAnswer({ question: "Un IDM ?", excerpts });
    }
    expect(queries).toEqual(["Un IDM ?", "Un IDM (infarctus du myocarde) ?"]);
  });

  it("reports a model failure as an LLMError (clean error message in the chat)", async () => {
    const broken: Embedder = { ...fakeEmbedder, embedPassages: async () => Promise.reject(new Error("no model")) };
    const provider = new ExtractiveProvider({ embedder: broken, minSimilarity: 0.5, abbreviations: false });
    await expect(provider.generateAnswer({ question: "q", excerpts })).rejects.toBeInstanceOf(LLMError);
  });
});
