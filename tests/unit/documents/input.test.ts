import { describe, expect, it } from "vitest";
import { MAX_DOCUMENT_BYTES, MAX_PDF_BYTES, readDocumentInput, titleFromFilename } from "@/lib/documents/input";

const empty = { title: null, text: null, file: null };

function file(content: BlobPart, name: string) {
  return new File([content], name, { type: "text/plain" });
}

describe("readDocumentInput — pasted text", () => {
  it("accepts a title and a text", async () => {
    await expect(
      readDocumentInput({ ...empty, title: "  FAQ  ", text: "Contenu" }),
    ).resolves.toEqual({
      ok: true,
      data: { title: "FAQ", content: "Contenu", source: "PASTE", filename: null },
    });
  });

  it("requires a title", async () => {
    const result = await readDocumentInput({ ...empty, title: " ", text: "Contenu" });
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/titre/i) });
  });

  it("rejects an empty submission", async () => {
    const result = await readDocumentInput({ ...empty, title: "FAQ", text: "  \n " });
    expect(result.ok).toBe(false);
  });

  it("rejects a text over 1 MB", async () => {
    const result = await readDocumentInput({
      ...empty,
      title: "Gros",
      text: "é".repeat(MAX_DOCUMENT_BYTES / 2 + 1), // 2 bytes per char in UTF-8
    });
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/1 Mo/) });
  });

  it("rejects a title that is too long", async () => {
    const result = await readDocumentInput({ ...empty, title: "t".repeat(201), text: "x" });
    expect(result.ok).toBe(false);
  });
});

describe("readDocumentInput — file", () => {
  it("accepts a .md file and defaults the title to the file name", async () => {
    const result = await readDocumentInput({ ...empty, file: file("# Guide", "guide_support.md") });
    expect(result).toEqual({
      ok: true,
      data: { title: "guide support", content: "# Guide", source: "FILE", filename: "guide_support.md" },
    });
  });

  it("keeps an explicit title and accepts upper-case .TXT", async () => {
    const result = await readDocumentInput({ ...empty, title: "Mon titre", file: file("x", "A.TXT") });
    expect(result.ok && result.data.title).toBe("Mon titre");
  });

  it("takes the file over pasted text", async () => {
    const result = await readDocumentInput({ title: "T", text: "collé", file: file("fichier", "a.txt") });
    expect(result.ok && result.data.content).toBe("fichier");
  });

  it("rejects other extensions", async () => {
    const result = await readDocumentInput({ ...empty, file: file("PK", "contrat.docx") });
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/\.txt, \.md et \.pdf/) });
  });

  it("rejects a file over 1 MB", async () => {
    const result = await readDocumentInput({
      ...empty,
      file: file("a".repeat(MAX_DOCUMENT_BYTES + 1), "big.txt"),
    });
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/1 Mo/) });
  });

  it("rejects a blank file", async () => {
    const result = await readDocumentInput({ ...empty, file: file("  \n", "blank.txt") });
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/vide/) });
  });

  it("rejects a file that is not valid UTF-8", async () => {
    const latin1 = new Uint8Array([0x63, 0x61, 0x66, 0xe9]); // "café" in Latin-1
    const result = await readDocumentInput({ ...empty, file: file(latin1, "latin1.txt") });
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/UTF-8/) });
  });

  it("ignores an empty file input (no file chosen) and falls back to text", async () => {
    const result = await readDocumentInput({ title: "T", text: "collé", file: file("", "") });
    expect(result.ok && result.data.source).toBe("PASTE");
  });
});

describe("readDocumentInput — PDF", () => {
  const pdf = (size = 10, name = "guide.pdf") => new File([new Uint8Array(size)], name, { type: "application/pdf" });
  const extracting = (text: string) => ({ pdfToText: async () => text });

  it("stores the extracted text, title from the file name", async () => {
    const result = await readDocumentInput({ ...empty, file: pdf(10, "Guide-Support.PDF") }, extracting("Texte du PDF"));
    expect(result).toEqual({
      ok: true,
      data: { title: "Guide Support", content: "Texte du PDF", source: "FILE", filename: "Guide-Support.PDF" },
    });
  });

  it("hands the file bytes to the extractor", async () => {
    let received = 0;
    await readDocumentInput(
      { ...empty, file: pdf(42) },
      { pdfToText: async (bytes) => ((received = bytes.byteLength), "x") },
    );
    expect(received).toBe(42);
  });

  it("accepts a PDF over 1 MB, up to 2 MB", async () => {
    const result = await readDocumentInput({ ...empty, file: pdf(MAX_PDF_BYTES) }, extracting("x"));
    expect(result.ok).toBe(true);
  });

  it("rejects a PDF over 2 MB without reading it", async () => {
    let called = false;
    const result = await readDocumentInput(
      { ...empty, file: pdf(MAX_PDF_BYTES + 1) },
      { pdfToText: async () => ((called = true), "x") },
    );
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/2 Mo/) });
    expect(called).toBe(false);
  });

  it("explains an unreadable PDF", async () => {
    const result = await readDocumentInput(
      { ...empty, file: pdf() },
      { pdfToText: async () => Promise.reject(new Error("Invalid PDF structure")) },
    );
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/Impossible de lire ce PDF/) });
  });

  it("explains a PDF without text (scan)", async () => {
    const result = await readDocumentInput({ ...empty, file: pdf() }, extracting("  \n "));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/scanné/) });
  });

  it("rejects extracted text over 1 MB", async () => {
    const result = await readDocumentInput({ ...empty, file: pdf() }, extracting("a".repeat(MAX_DOCUMENT_BYTES + 1)));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/texte extrait.*1 Mo/) });
  });

  it("refuses PDFs when no extractor is provided", async () => {
    const result = await readDocumentInput({ ...empty, file: pdf() });
    expect(result.ok).toBe(false);
  });
});

describe("titleFromFilename", () => {
  it("drops the extension and separators", () => {
    expect(titleFromFilename("conditions-generales_2026.md")).toBe("conditions generales 2026");
  });
});
