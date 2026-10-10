import { describe, expect, it } from "vitest";
import { cleanExcerpt, splitCitations } from "@/lib/chat/segments";

describe("cleanExcerpt", () => {
  it("removes Markdown heading markers at the start and inside the excerpt", () => {
    expect(cleanExcerpt("# Support Les horaires sont de 9h à 18h. ## Livraison 48 heures.")).toBe(
      "Support Les horaires sont de 9h à 18h. Livraison 48 heures.",
    );
  });

  it("keeps a # that is not a heading marker", () => {
    expect(cleanExcerpt("Ticket #42 et canal C# : voir le wiki.")).toBe("Ticket #42 et canal C# : voir le wiki.");
  });
});

describe("splitCitations", () => {
  it("separates text from citations, keeping their order", () => {
    expect(splitCitations("Ouvert de 9h à 18h [2]. Fermé le week-end [1][2].")).toEqual([
      { type: "text", text: "Ouvert de 9h à 18h " },
      { type: "cite", refs: [2] },
      { type: "text", text: ". Fermé le week-end " },
      { type: "cite", refs: [1] },
      { type: "cite", refs: [2] },
      { type: "text", text: "." },
    ]);
  });

  it("reads comma-separated citations as one group", () => {
    expect(splitCitations("Voir [1, 3]")).toEqual([
      { type: "text", text: "Voir " },
      { type: "cite", refs: [1, 3] },
    ]);
  });

  it("returns the whole text when there is no citation", () => {
    expect(splitCitations("Pas de citation (2024).")).toEqual([
      { type: "text", text: "Pas de citation (2024)." },
    ]);
  });

  it("returns nothing for an empty answer", () => {
    expect(splitCitations("")).toEqual([]);
  });
});
