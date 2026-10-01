import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getConversation } from "@/lib/chat/history";
import { formatDate } from "../../format";

export const metadata: Metadata = { title: "Conversation — DocBot admin" };

export default async function ConversationPage({ params }: PageProps<"/admin/conversations/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const conversation = await getConversation(id);
  if (!conversation) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/conversations" className="text-sm text-zinc-500 hover:underline">
        ← Conversations
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Conversation</h1>
        <p className="text-sm text-zinc-500">
          Commencée le {formatDate(conversation.createdAt)} · {conversation.messages.length} messages
        </p>
      </div>
      <ol className="flex flex-col gap-4">
        {conversation.messages.map((message) => (
          <li
            key={message.id}
            aria-label={message.role === "USER" ? "Question du visiteur" : "Réponse de DocBot"}
            className={`flex flex-col gap-2 rounded-lg border px-4 py-3 ${
              message.role === "USER"
                ? "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900"
                : "border-zinc-200 dark:border-zinc-800"
            }`}
          >
            <p className="text-xs font-medium text-zinc-500">
              {message.role === "USER" ? "Visiteur" : "DocBot"} · {formatDate(message.createdAt)}
            </p>
            <p className="whitespace-pre-wrap">{message.content}</p>
            {message.sources.length > 0 && (
              <ul aria-label="Sources" className="flex flex-col gap-1 text-sm">
                {message.sources.map((source) => (
                  <li key={source.ref} className="text-zinc-600 dark:text-zinc-400">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      [{source.ref}] {source.documentTitle}
                    </span>{" "}
                    — {source.excerpt}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
