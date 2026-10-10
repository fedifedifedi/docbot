import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getDocumentWithChunks } from "@/lib/documents/service";
import { ArrowLeftIcon } from "../../../../icons";
import { backLink, card, pageTitle, pill } from "../../../styles";
import { DeleteDocumentButton } from "../delete-document-button";
import { formatDate, sourceLabel } from "../../format";

export const metadata: Metadata = { title: "Document — DocBot admin" };

export default async function DocumentPage({ params }: PageProps<"/admin/documents/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const document = await getDocumentWithChunks(id);
  if (!document) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/documents" className={backLink}>
        <ArrowLeftIcon className="size-4" />
        Documents
      </Link>
      <div className={`${card} flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6`}>
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className={`${pageTitle} break-words`}>
            {document.title}
          </h1>
          <p className="flex flex-wrap gap-2">
            <span className={pill}>{sourceLabel(document.source, document.filename)}</span>
            <span className={pill}>Ajouté le {formatDate(document.createdAt)}</span>
            <span className={pill}>
              {document.chunks.length} chunk{document.chunks.length > 1 ? "s" : ""}
            </span>
          </p>
        </div>
        <DeleteDocumentButton id={document.id} title={document.title} />
      </div>
      <ol className="flex flex-col gap-3">
        {document.chunks.map((chunk, i) => (
          <li
            key={chunk.id}
            className={`${card} flex animate-fade-up flex-col gap-2 p-4 sm:p-5`}
            style={{ animationDelay: `${Math.min(i, 8) * 70}ms` }}
          >
            <p className="flex items-center gap-2 text-xs">
              <span className="rounded-full bg-sage-100 px-2.5 py-0.5 font-semibold text-sage-800 dark:bg-sage-900 dark:text-sage-200">
                Chunk {chunk.index + 1}
              </span>
              <span className="text-stone-400 dark:text-stone-500">{chunk.content.length} caractères</span>
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700 dark:text-stone-300">
              {chunk.content}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
