import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { listDocuments } from "@/lib/documents/service";
import { AddDocumentForm } from "./add-document-form";
import { DeleteDocumentButton } from "./delete-document-button";
import { formatDate, sourceLabel } from "./format";

export const metadata: Metadata = { title: "Documents — DocBot admin" };

export default async function DocumentsPage() {
  await requireAdmin();
  const documents = await listDocuments();

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <AddDocumentForm />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          Base documentaire ({documents.length})
        </h2>
        {documents.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucun document pour l&apos;instant.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
                <tr>
                  <th className="py-2 pr-4 font-medium">Titre</th>
                  <th className="py-2 pr-4 font-medium">Source</th>
                  <th className="py-2 pr-4 font-medium">Chunks</th>
                  <th className="py-2 pr-4 font-medium">Ajouté le</th>
                  <th className="py-2 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="py-2 pr-4">
                      <Link href={`/admin/documents/${doc.id}`} className="font-medium hover:underline">
                        {doc.title}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                      {sourceLabel(doc.source, doc.filename)}
                    </td>
                    <td className="py-2 pr-4">{doc._count.chunks}</td>
                    <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                      {formatDate(doc.createdAt)}
                    </td>
                    <td className="py-2 text-right">
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
