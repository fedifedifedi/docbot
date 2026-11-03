import { extractText } from "unpdf";

/**
 * Extracts the text of a PDF, one block per page. Throws if the file is not a readable PDF
 * (corrupted, encrypted…). Scanned PDFs (images only) give an empty string: no OCR.
 */
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  // PDF.js may detach the buffer it is given: pass a copy so the caller keeps its bytes.
  const { text } = await extractText(new Uint8Array(bytes), { mergePages: false });
  return text
    .map((page) => page.trim())
    .filter(Boolean)
    .join("\n\n");
}
