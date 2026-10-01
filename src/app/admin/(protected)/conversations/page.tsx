import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { listConversations } from "@/lib/chat/history";
import { formatDate } from "../format";

export const metadata: Metadata = { title: "Conversations — DocBot admin" };

function truncate(text: string, max = 120): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export default async function ConversationsPage({ searchParams }: PageProps<"/admin/conversations">) {
  await requireAdmin();
  const { page } = await searchParams;
  const requested = Number(Array.isArray(page) ? page[0] : page) || 1;
  const { conversations, page: current, pageCount, total } = await listConversations(requested);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Conversations ({total})</h1>
      {conversations.length === 0 ? (
        <p className="text-sm text-zinc-500">Aucune conversation pour l&apos;instant.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
              <tr>
                <th className="py-2 pr-4 font-medium">Première question</th>
                <th className="py-2 pr-4 font-medium">Messages</th>
                <th className="py-2 pr-4 font-medium">Début</th>
                <th className="py-2 font-medium">Dernière activité</th>
              </tr>
            </thead>
            <tbody>
              {conversations.map((c) => (
                <tr key={c.id} className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="py-2 pr-4">
                    <Link href={`/admin/conversations/${c.id}`} className="font-medium hover:underline">
                      {c.firstQuestion ? truncate(c.firstQuestion) : "(sans question)"}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{c.messageCount}</td>
                  <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">{formatDate(c.createdAt)}</td>
                  <td className="py-2 text-zinc-600 dark:text-zinc-400">{formatDate(c.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pageCount > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-4 text-sm">
          {current > 1 && (
            <Link href={`/admin/conversations?page=${current - 1}`} className="hover:underline">
              ← Plus récentes
            </Link>
          )}
          <span className="text-zinc-500">
            Page {current} / {pageCount}
          </span>
          {current < pageCount && (
            <Link href={`/admin/conversations?page=${current + 1}`} className="hover:underline">
              Plus anciennes →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
