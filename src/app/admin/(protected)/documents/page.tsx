import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { listDocuments } from "@/lib/documents/service";
import { DocumentIcon } from "../../../icons";
import { card, pill, table } from "../../styles";
import { AddDocumentForm } from "./add-document-form";
import { DeleteDocumentButton } from "./delete-document-button";
import { formatDate, sourceLabel } from "../format";

export const metadata: Metadata = { title: "Documents — DocBot admin" };

export default async function DocumentsPage() {
  await requireAdmin();
  const documents = await listDocuments();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-cream-50">Documents</h1>
        <p className="text-stone-500 dark:text-stone-400">
          Le chatbot répond uniquement à partir de ces textes, découpés en chunks pour la recherche.
        </p>
      </div>

      <section aria-labelledby="add-document" className={`${card} flex flex-col gap-4 p-5 sm:p-6`}>
        <h2 id="add-document" className="font-semibold text-stone-900 dark:text-cream-50">
          Ajouter un document
        </h2>
        <AddDocumentForm />
      </section>

      <section aria-labelledby="document-list" className="flex flex-col gap-3">
        <h2 id="document-list" className="flex items-center gap-2 font-semibold text-stone-900 dark:text-cream-50">
          Base documentaire
          <span className={pill}>{documents.length}</span>
        </h2>
        {documents.length === 0 ? (
          <div className={`${card} flex flex-col items-center gap-2 px-6 py-10 text-center`}>
            <DocumentIcon className="size-8 text-stone-300 dark:text-stone-600" />
            <p className="text-sm text-stone-500 dark:text-stone-400">Aucun document pour l&apos;instant.</p>
          </div>
        ) : (
          <div className={table.wrapper}>
            <table className={table.table}>
              <thead className={table.head}>
                <tr>
                  <th className={table.th}>Titre</th>
                  <th className={table.th}>Source</th>
                  <th className={table.th}>Chunks</th>
                  <th className={table.th}>Ajouté le</th>
                  <th className={table.th}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className={table.row}>
                    <td className={table.td}>
                      <Link
                        href={`/admin/documents/${doc.id}`}
                        className="font-medium text-stone-900 hover:text-sage-700 hover:underline dark:text-stone-100 dark:hover:text-sage-300"
                      >
                        {doc.title}
                      </Link>
                    </td>
                    <td className={table.td}>
                      <span className={pill}>{sourceLabel(doc.source, doc.filename)}</span>
                    </td>
                    <td className={`${table.td} tabular-nums text-stone-600 dark:text-stone-300`}>
                      {doc._count.chunks}
                    </td>
                    <td className={`${table.td} whitespace-nowrap text-stone-500 dark:text-stone-400`}>
                      {formatDate(doc.createdAt)}
                    </td>
                    <td className={`${table.td} text-right`}>
                      <DeleteDocumentButton id={doc.id} title={doc.title} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
