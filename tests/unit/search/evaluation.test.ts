import { describe, expect, it } from "vitest";
import { describeHit, judge } from "@/lib/search/evaluation";

const DOC = "Protocole démo";
const hit = (content: string, documentTitle = DOC) => ({ documentTitle, content });
const grossesse = hit("## Grossesse et examens irradiants\n\nToute patiente… éventuelle grossesse…");
const jeune = hit("## Jeûne avant un examen\n\nLe patient est à jeun…");

describe("judge — answerable question", () => {
  const expected = { documentTitle: DOC, phrase: "éventuelle grossesse" };

  it("passes when the first hit has the phrase", () => {
    expect(judge(expected, [grossesse, jeune])).toEqual({
      passed: true,
      obtained: "Grossesse et examens irradiants (Protocole démo)",
    });
  });

  it("fails when the right passage is only second", () => {
    expect(judge(expected, [jeune, grossesse]).passed).toBe(false);
  });

  it("fails when the phrase comes from another document", () => {
    const other = hit("## Grossesse\n\néventuelle grossesse", "Ancien protocole (PDF)");
    expect(judge(expected, [other]).passed).toBe(false);
  });

  it("fails on a refusal", () => {
    expect(judge(expected, [])).toEqual({ passed: false, obtained: "aucun passage → refus" });
  });
});

describe("judge — off-topic question", () => {
  it("passes only with no hit at all", () => {
    expect(judge(null, []).passed).toBe(true);
    expect(judge(null, [jeune])).toEqual({
      passed: false,
      obtained: "1 passage(s), 1er : Jeûne avant un examen (Protocole démo)",
    });
  });
});

describe("describeHit", () => {
  it("uses the first words when the chunk has no heading", () => {
    expect(describeHit(hit("Clinique fictive des Oliviers, service d'imagerie médicale."))).toBe(
      "Clinique fictive des Oliviers, service d… (Protocole démo)",
    );
  });
});
