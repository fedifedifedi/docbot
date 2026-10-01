"use client";

import { useActionState } from "react";
import { addDocument, type AddDocumentState } from "./actions";

const initialState: AddDocumentState = { error: null, success: null, title: "", text: "" };

const field =
  "rounded-md border border-zinc-300 px-3 py-2 font-normal dark:border-zinc-700 dark:bg-zinc-900";

export function AddDocumentForm() {
  const [state, formAction, pending] = useActionState(addDocument, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Titre
        <input
          name="title"
          maxLength={200}
          defaultValue={state.title}
          placeholder="Optionnel pour un fichier (nom du fichier par défaut)"
          className={field}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Texte
        <textarea name="text" rows={8} defaultValue={state.text} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        … ou fichier .txt / .md (1 Mo max)
        <input
          type="file"
          name="file"
          accept=".txt,.md,text/plain,text/markdown"
          className="text-sm font-normal"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-green-700 dark:text-green-400">
          {state.success}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Ajout…" : "Ajouter le document"}
      </button>
    </form>
  );
}
