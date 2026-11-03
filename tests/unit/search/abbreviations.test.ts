import { describe, expect, it } from "vitest";
import { expandAbbreviations, MEDICAL_ABBREVIATIONS } from "@/lib/search/abbreviations";

describe("expandAbbreviations", () => {
  it("adds the long form next to the abbreviation, which is kept", () => {
    expect(expandAbbreviations("Conduite à tenir face à un IDM ?")).toBe(
      "Conduite à tenir face à un IDM (infarctus du myocarde) ?",
    );
  });

  it("expands several abbreviations, each once", () => {
    expect(expandAbbreviations("AVC ou AIT ? Un AVC, vraiment ?")).toBe(
      "AVC (accident vasculaire cérébral) ou AIT (accident ischémique transitoire) ? Un AVC, vraiment ?",
    );
  });

  it("matches whole words only", () => {
    expect(expandAbbreviations("IRMf et TDMX")).toBe("IRMf et TDMX");
    expect(expandAbbreviations("(IRM)")).toBe("(IRM (imagerie par résonance magnétique))");
  });

  it("matches capitals only, so French words are never altered", () => {
    expect(expandAbbreviations("Il ira demain, idm ou pas.")).toBe("Il ira demain, idm ou pas.");
  });

  it("leaves unknown abbreviations and plain questions untouched", () => {
    expect(expandAbbreviations("Le XYZ est-il ouvert ?")).toBe("Le XYZ est-il ouvert ?");
    expect(expandAbbreviations("Quels sont les horaires ?")).toBe("Quels sont les horaires ?");
  });

  it("ignores inherited object keys", () => {
    expect(expandAbbreviations("constructor")).toBe("constructor");
  });

  it("accepts another dictionary", () => {
    expect(expandAbbreviations("Un PACS ?", { PACS: "système d'archivage d'images" })).toBe(
      "Un PACS (système d'archivage d'images) ?",
    );
  });
});

describe("MEDICAL_ABBREVIATIONS", () => {
  const entries = Object.entries(MEDICAL_ABBREVIATIONS);

  it("is a general list of 20 to 30 entries", () => {
    expect(entries.length).toBeGreaterThanOrEqual(20);
    expect(entries.length).toBeLessThanOrEqual(30);
  });

  it("has capital-letter keys and non-empty lower-case long forms", () => {
    for (const [abbreviation, long] of entries) {
      expect(abbreviation).toMatch(/^\p{Lu}[\p{Lu}\p{N}]+$/u);
      expect(long.trim()).not.toBe("");
      expect(long).not.toMatch(/^\p{Lu}/u);
    }
  });
});
