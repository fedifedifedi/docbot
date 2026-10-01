import { z } from "zod";

export const MAX_DOCUMENT_BYTES = 1024 * 1024;
export const MAX_TITLE_LENGTH = 200;
export const ALLOWED_EXTENSIONS = [".txt", ".md"] as const;

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

/**
 * Validates the "add document" form. A non-empty file takes precedence over pasted text.
 * Error messages are user-facing (French).
 */
export async function readDocumentInput(form: RawDocumentForm): Promise<InputResult> {
  const title = titleSchema.safeParse(typeof form.title === "string" ? form.title : "");
  if (!title.success) return { ok: false, error: title.error.issues[0].message };

  if (isNonEmptyFile(form.file)) {
    const file = form.file;
    if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(extensionOf(file.name))) {
      return { ok: false, error: "Seuls les fichiers .txt et .md sont acceptés." };
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      return { ok: false, error: "Le fichier dépasse la taille maximale de 1 Mo." };
    }
    let content: string;
    try {
      content = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
    } catch {
      return { ok: false, error: "Le fichier doit être un texte encodé en UTF-8." };
    }
    if (!content.trim()) return { ok: false, error: "Le fichier est vide." };
    return {
      ok: true,
      data: {
        title: title.data || titleFromFilename(file.name) || file.name,
        content,
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
