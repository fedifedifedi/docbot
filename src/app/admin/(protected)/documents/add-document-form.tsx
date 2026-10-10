"use client";

import { useActionState } from "react";
import { MAX_DOCUMENT_BYTES, MAX_TITLE_LENGTH } from "@/lib/documents/limits";
import { AlertIcon, CheckIcon } from "../../../icons";
import { alertBox, field, label, primaryButton, successBox } from "../../styles";
import { addDocument, type AddDocumentState } from "./actions";

const initialState: AddDocumentState = { error: null, success: null, title: "", text: "" };

export function AddDocumentForm() {
  const [state, formAction, pending] = useActionState(addDocument, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className={label}>
        Titre
        <input
          name="title"
          maxLength={MAX_TITLE_LENGTH}
          defaultValue={state.title}
          placeholder="Optionnel pour un fichier (nom du fichier par défaut)"
          className={field}
        />
      </label>
      <label className={label}>
        Texte
        {/* Client-side cap: bigger payloads would be cut off by the Server Action body limit
            before reaching the server-side validation and its readable error message. */}
        <textarea
          name="text"
          rows={7}
          maxLength={MAX_DOCUMENT_BYTES}
          defaultValue={state.text}
          placeholder="Collez ici le contenu du document…"
          className={`${field} resize-y leading-relaxed`}
        />
      </label>
      <label className={label}>
        … ou fichier .txt / .md (1 Mo max)
        <input
          type="file"
          name="file"
          accept=".txt,.md,text/plain,text/markdown"
          className="rounded-xl border border-dashed border-cream-300 bg-cream-50 p-2 text-sm font-normal text-stone-600 file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-sage-100 file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-sage-800 hover:file:bg-sage-200 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-400 dark:file:bg-sage-900 dark:file:text-sage-100"
        />
      </label>
      {state.error && (
        <p role="alert" className={alertBox}>
          <AlertIcon className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className={successBox}>
          <CheckIcon className="mt-0.5 size-4 shrink-0" />
          {state.success}
        </p>
      )}
      <button type="submit" disabled={pending} className={`${primaryButton} self-start`}>
        {pending ? "Ajout…" : "Ajouter le document"}
      </button>
    </form>
  );
}
