import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { listConversations } from "@/lib/chat/history";
import { ArrowLeftIcon, ArrowRightIcon, ChatIcon } from "../../../icons";
import { card, pageTitle, pill, table } from "../../styles";
import { formatDate } from "../format";

export const metadata: Metadata = { title: "Conversations — DocBot admin" };

const pageButton =
  "inline-flex items-center gap-1.5 rounded-full border border-cream-200 bg-white px-4 py-2 text-sm text-stone-700 transition hover:border-sage-300 hover:text-sage-800 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-sage-700 dark:hover:text-sage-200";

function truncate(text: string, max = 120): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export default async function ConversationsPage({ searchParams }: PageProps<"/admin/conversations">) {
  await requireAdmin();
  const { page } = await searchParams;
  const requested = Number(Array.isArray(page) ? page[0] : page) || 1;
  const { conversations, page: current, pageCount, total } = await listConversations(requested);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className={`${pageTitle} flex items-center gap-2`}>
          Conversations
          <span className={pill}>{total}</span>
        </h1>
        <p className="text-stone-500 dark:text-stone-400">
          Les échanges des visiteurs avec le chatbot, des plus récents aux plus anciens.
        </p>
      </div>
      {conversations.length === 0 ? (
        <div className={`${card} flex flex-col items-center gap-2 px-6 py-10 text-center`}>
          <ChatIcon className="size-8 text-stone-300 dark:text-stone-600" />
          <p className="text-sm text-stone-500 dark:text-stone-400">Aucune conversation pour l&apos;instant.</p>
        </div>
      ) : (
        <div className={table.wrapper}>
          <table className={table.table}>
            <thead className={table.head}>
              <tr>
                <th className={table.th}>Première question</th>
                <th className={table.th}>Messages</th>
                <th className={table.th}>Début</th>
                <th className={table.th}>Dernière activité</th>
              </tr>
            </thead>
            <tbody>
              {conversations.map((c) => (
                <tr key={c.id} className={table.row}>
                  <td className={table.td}>
                    <Link
                      href={`/admin/conversations/${c.id}`}
                      className="font-medium text-stone-900 hover:text-sage-700 hover:underline dark:text-stone-100 dark:hover:text-sage-300"
                    >
                      {c.firstQuestion ? truncate(c.firstQuestion) : "(sans question)"}
                    </Link>
                  </td>
                  <td className={table.td}>
                    <span className={pill}>{c.messageCount}</span>
                  </td>
                  <td className={`${table.td} whitespace-nowrap text-stone-500 dark:text-stone-400`}>
                    {formatDate(c.createdAt)}
                  </td>
                  <td className={`${table.td} whitespace-nowrap text-stone-500 dark:text-stone-400`}>
                    {formatDate(c.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pageCount > 1 && (
        <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-3 text-sm">
          {current > 1 && (
            <Link href={`/admin/conversations?page=${current - 1}`} className={pageButton}>
              <ArrowLeftIcon className="size-4" />
              Plus récentes
            </Link>
          )}
          <span className="text-stone-500 dark:text-stone-400">
            Page {current} / {pageCount}
          </span>
          {current < pageCount && (
            <Link href={`/admin/conversations?page=${current + 1}`} className={pageButton}>
              Plus anciennes
              <ArrowRightIcon className="size-4" />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
