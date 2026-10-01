import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getDocumentWithChunks } from "@/lib/documents/service";
import { DeleteDocumentButton } from "../delete-document-button";
import { formatDate, sourceLabel } from "../../format";

export const metadata: Metadata = { title: "Document â€” DocBot admin" };

export default async function DocumentPage({ params }: PageProps<"/admin/documents/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const document = await getDocumentWithChunks(id);
  if (!document) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/documents" className="text-sm text-zinc-500 hover:underline">
        â† Documents
      </Link>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{document.title}</h1>
          <p className="text-sm text-zinc-500">
            {sourceLabel(document.source, document.filename)} Â· ajoutÃ© le{" "}
            {formatDate(document.createdAt)} Â· {document.chunks.length} chunk
            {document.chunks.length > 1 ? "s" : ""}
          </p>
        </div>
        <DeleteDocumentButton id={document.id} title={document.title} />
      </div>
      <ol className="flex flex-col gap-3">
        {document.chunks.map((chunk) => (
          <li
            key={chunk.id}
            className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
          >
            <p className="mb-1 text-xs font-medium text-zinc-500">Chunk {chunk.index + 1}</p>
            <p className="whitespace-pre-wrap text-sm">{chunk.content}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
