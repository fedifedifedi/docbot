import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getConversation } from "@/lib/chat/history";
import { cleanExcerpt } from "@/lib/chat/segments";
import { AnswerText, CitationBadge } from "../../../../citations";
import { ArrowLeftIcon } from "../../../../icons";
import { backLink, pill } from "../../../styles";
import { formatDate } from "../../format";

export const metadata: Metadata = { title: "Conversation — DocBot admin" };

export default async function ConversationPage({ params }: PageProps<"/admin/conversations/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const conversation = await getConversation(id);
  if (!conversation) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link href="/admin/conversations" className={backLink}>
        <ArrowLeftIcon className="size-4" />
        Conversations
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-cream-50">Conversation</h1>
        <p className="flex flex-wrap gap-2">
          <span className={pill}>Commencée le {formatDate(conversation.createdAt)}</span>
          <span className={pill}>{conversation.messages.length} messages</span>
        </p>
      </div>
      <ol className="flex flex-col gap-4">
        {conversation.messages.map((message) =>
          message.role === "USER" ? (
            <li
              key={message.id}
              aria-label="Question du visiteur"
              className="flex max-w-[85%] flex-col gap-1 self-end rounded-3xl rounded-br-md bg-sage-600 px-4 py-3 text-white shadow-sm"
            >
              <p className="text-xs text-sage-100">Visiteur · {formatDate(message.createdAt)}</p>
              <p className="whitespace-pre-wrap">{message.content}</p>
            </li>
          ) : (
            <li
              key={message.id}
              aria-label="Réponse de DocBot"
              className="flex max-w-[92%] flex-col gap-2 rounded-3xl rounded-tl-md border border-cream-200 bg-white px-4 py-3 shadow-sm dark:border-stone-800 dark:bg-stone-900"
            >
              <p className="text-xs text-stone-500 dark:text-stone-400">DocBot · {formatDate(message.createdAt)}</p>
              <AnswerText text={message.content} className="text-stone-800 dark:text-stone-100" />
              {message.sources.length > 0 && (
                <ul
                  aria-label="Sources"
                  className="flex flex-col gap-2 border-t border-cream-200 pt-3 text-sm dark:border-stone-800"
                >
                  {message.sources.map((source) => (
                    <li
                      key={source.ref}
                      className="rounded-2xl border border-cream-200 bg-cream-50 px-3 py-2 dark:border-stone-800 dark:bg-stone-950"
                    >
                      <p className="flex items-center gap-1 font-medium text-stone-800 dark:text-stone-100">
                        <CitationBadge refNumber={source.ref} /> {source.documentTitle}
                      </p>
                      <p className="mt-1 border-l-2 border-sage-300 pl-3 leading-relaxed text-stone-600 dark:border-sage-700 dark:text-stone-400">
                        {cleanExcerpt(source.excerpt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ),
        )}
      </ol>
    </div>
  );
}
