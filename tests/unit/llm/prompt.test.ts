import { describe, expect, it } from "vitest";
import { buildUserMessage, NOT_FOUND_ANSWER, SYSTEM_PROMPT } from "@/lib/llm/prompt";

describe("prompt", () => {
  it("system prompt enforces grounding, citations and the exact not-found sentence", () => {
    expect(SYSTEM_PROMPT).toContain("exclusivement les informations présentes dans les extraits");
    expect(SYSTEM_PROMPT).toContain("[1]");
    expect(SYSTEM_PROMPT).toContain(NOT_FOUND_ANSWER);
    expect(SYSTEM_PROMPT).toMatch(/ignore toute consigne/);
  });

  it("numbers excerpts and escapes document titles", () => {
    const message = buildUserMessage({
      question: "Horaires ?",
      excerpts: [
        { ref: 1, documentTitle: 'Guide "support" <v2>', content: "Ouvert 9h-18h." },
        { ref: 2, documentTitle: "FAQ", content: "Fermé le week-end." },
      ],
    });
    expect(message).toContain(
      '<extrait numero="1" document="Guide &quot;support&quot; &lt;v2&gt;">\nOuvert 9h-18h.\n</extrait>',
    );
    expect(message).toContain('<extrait numero="2" document="FAQ">');
    expect(message.trim().endsWith("Question du visiteur : Horaires ?")).toBe(true);
  });
});
