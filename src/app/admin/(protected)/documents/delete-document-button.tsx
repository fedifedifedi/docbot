"use client";

import { TrashIcon } from "../../../icons";
import { removeDocument } from "./actions";

export function DeleteDocumentButton({ id, title }: { id: string; title: string }) {
  return (
    <form
      action={removeDocument}
      onSubmit={(event) => {
        if (!window.confirm(`Supprimer « ${title} » et tous ses chunks ?`)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        aria-label={`Supprimer ${title}`}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/50"
      >
        <TrashIcon className="size-4" />
        Supprimer
      </button>
    </form>
  );
}
