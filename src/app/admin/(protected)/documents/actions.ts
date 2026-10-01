"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { readDocumentInput } from "@/lib/documents/input";
import { createDocument, deleteDocument } from "@/lib/documents/service";

const DOCUMENTS_PATH = "/admin/documents";

// Title and text are echoed back on error so the form keeps them (React resets forms after an action).
export type AddDocumentState = {
  error: string | null;
  success: string | null;
  title: string;
  text: string;
};

export async function addDocument(
  _prev: AddDocumentState,
  formData: FormData,
): Promise<AddDocumentState> {
  await requireAdmin();

  const raw = { title: formData.get("title"), text: formData.get("text"), file: formData.get("file") };
  const keep = {
    title: typeof raw.title === "string" ? raw.title : "",
    text: typeof raw.text === "string" ? raw.text : "",
  };

  const input = await readDocumentInput(raw);
  if (!input.ok) return { ...keep, error: input.error, success: null };

  try {
    const { chunkCount } = await createDocument(input.data);
    revalidatePath(DOCUMENTS_PATH);
    return {
      title: "",
      text: "",
      error: null,
      success: `« ${input.data.title} » ajouté (${chunkCount} chunk${chunkCount > 1 ? "s" : ""}).`,
    };
  } catch (error) {
    console.error("[documents] create failed", error);
    return { ...keep, error: "L'enregistrement du document a échoué.", success: null };
  }
}

const idSchema = z.string().min(1).max(64);

export async function removeDocument(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (id.success) await deleteDocument(id.data);
  revalidatePath(DOCUMENTS_PATH);
  redirect(DOCUMENTS_PATH);
}
