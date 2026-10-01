"use client";

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
        className="text-sm text-red-600 hover:underline"
      >
        Supprimer
      </button>
    </form>
  );
}
