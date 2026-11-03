import { z } from "zod";
import { MAX_DOCUMENT_BYTES, MAX_PDF_BYTES, MAX_TITLE_LENGTH } from "./limits";

export { MAX_DOCUMENT_BYTES, MAX_PDF_BYTES, MAX_TITLE_LENGTH };
export const ALLOWED_EXTENSIONS = [".txt", ".md", ".pdf"] as const;

export type DocumentInput = {
  title: string;
  content: string;
  source: "PASTE" | "FILE";
  filename: string | null;
};

export type InputResult = { ok: true; data: DocumentInput } | { ok: false; error: string };

export type RawDocumentForm = {
  title: FormDataEntryValue | null;
  text: FormDataEntryValue | null;
  file: FormDataEntryValue | null;
};

/** PDF text extraction, injected so this module stays light and testable with a fake. */
export type InputDeps = {
  pdfToText?: (bytes: Uint8Array) => Promise<string>;
};

const titleSchema = z
  .string()
  .trim()
  .max(MAX_TITLE_LENGTH, `Le titre doit faire au plus ${MAX_TITLE_LENGTH} caractères.`);

export function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .slice(0, MAX_TITLE_LENGTH);
}

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot).toLowerCase() : "";
}

function isNonEmptyFile(value: FormDataEntryValue | null): value is File {
  return typeof value === "object" && value !== null && value.size > 0;
}

type ContentResult = { ok: true; content: string } | { ok: false; error: string };

async function readTextFile(file: File): Promise<ContentResult> {
  if (file.size > MAX_DOCUMENT_BYTES) {
    return { ok: false, error: "Le fichier dépasse la taille maximale de 1 Mo." };
  }
  try {
    return { ok: true, content: new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer()) };
  } catch {
    return { ok: false, error: "Le fichier doit être un texte encodé en UTF-8." };
  }
}

async function readPdfFile(file: File, pdfToText: InputDeps["pdfToText"]): Promise<ContentResult> {
  if (!pdfToText) return { ok: false, error: "La lecture des PDF n'est pas disponible." };
  if (file.size > MAX_PDF_BYTES) {
    return { ok: false, error: "Le PDF dépasse la taille maximale de 2 Mo." };
  }
  let content: string;
  try {
    content = await pdfToText(new Uint8Array(await file.arrayBuffer()));
  } catch {
    return { ok: false, error: "Impossible de lire ce PDF (fichier abîmé ou protégé par un mot de passe)." };
  }
  if (!content.trim()) {
    return { ok: false, error: "Ce PDF ne contient pas de texte lisible (document scanné ?)." };
  }
  if (new TextEncoder().encode(content).length > MAX_DOCUMENT_BYTES) {
    return { ok: false, error: "Le texte extrait du PDF dépasse la taille maximale de 1 Mo." };
  }
  return { ok: true, content };
}

/**
 * Validates the "add document" form. A non-empty file takes precedence over pasted text.
 * Error messages are user-facing (French).
 */
export async function readDocumentInput(form: RawDocumentForm, deps: InputDeps = {}): Promise<InputResult> {
  const title = titleSchema.safeParse(typeof form.title === "string" ? form.title : "");
  if (!title.success) return { ok: false, error: title.error.issues[0].message };

  if (isNonEmptyFile(form.file)) {
    const file = form.file;
    const extension = extensionOf(file.name);
    if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(extension)) {
      return { ok: false, error: "Seuls les fichiers .txt, .md et .pdf sont acceptés." };
    }
    const read = extension === ".pdf" ? await readPdfFile(file, deps.pdfToText) : await readTextFile(file);
    if (!read.ok) return read;
    if (!read.content.trim()) return { ok: false, error: "Le fichier est vide." };
    return {
      ok: true,
      data: {
        title: title.data || titleFromFilename(file.name) || file.name,
        content: read.content,
        source: "FILE",
        filename: file.name,
      },
    };
  }

  const text = typeof form.text === "string" ? form.text : "";
  if (!text.trim()) return { ok: false, error: "Collez un texte ou choisissez un fichier." };
  if (new TextEncoder().encode(text).length > MAX_DOCUMENT_BYTES) {
    return { ok: false, error: "Le texte dépasse la taille maximale de 1 Mo." };
  }
  if (!title.data) return { ok: false, error: "Le titre est obligatoire pour un texte collé." };
  return { ok: true, data: { title: title.data, content: text, source: "PASTE", filename: null } };
}
