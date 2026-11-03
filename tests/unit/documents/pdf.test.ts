import { describe, expect, it } from "vitest";
import { extractPdfText } from "@/lib/documents/pdf";
import { makePdf } from "../../fixtures/pdf";

describe("extractPdfText", () => {
  it("returns the text of a PDF, accents included", async () => {
    const text = await extractPdfText(
      makePdf(["Les horaires du support sont de 9h à 18h.", "Fermé le week-end."]),
    );
    expect(text).toContain("Les horaires du support sont de 9h à 18h.");
    expect(text).toContain("Fermé le week-end.");
  });

  it("returns an empty string for a page without text (scanned document)", async () => {
    await expect(extractPdfText(makePdf([]))).resolves.toBe("");
  });

  it("throws on a file that is not a PDF", async () => {
    await expect(extractPdfText(new TextEncoder().encode("pas un PDF"))).rejects.toThrow();
  });

  it("leaves the caller's buffer usable", async () => {
    const bytes = makePdf(["Bonjour"]);
    await extractPdfText(bytes);
    expect(bytes.byteLength).toBeGreaterThan(0);
  });
});
