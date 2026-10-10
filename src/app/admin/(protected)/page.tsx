import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { listConversations } from "@/lib/chat/history";
import { listDocuments } from "@/lib/documents/service";
import { ArrowRightIcon, ChatIcon, DocumentIcon, PuzzleIcon } from "../../icons";
import { card } from "../styles";

export const metadata: Metadata = { title: "Tableau de bord — DocBot admin" };

export default async function AdminHome() {
  await requireAdmin();
  const [documents, { total: conversationCount }] = await Promise.all([listDocuments(), listConversations(1)]);
  const chunkCount = documents.reduce((sum, doc) => sum + doc._count.chunks, 0);

  const stats = [
    { label: "Documents", value: documents.length, icon: DocumentIcon },
    { label: "Chunks indexés", value: chunkCount, icon: PuzzleIcon },
    { label: "Conversations", value: conversationCount, icon: ChatIcon },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-cream-50">Tableau de bord</h1>
        <p className="text-stone-500 dark:text-stone-400">
          Gérez la documentation du chatbot et suivez les questions des visiteurs.
        </p>
      </div>

      <dl className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className={`${card} flex items-center gap-4 p-5`}>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sage-100 text-sage-700 dark:bg-sage-900 dark:text-sage-200">
              <Icon />
            </span>
            <div className="flex flex-col-reverse">
              <dt className="text-sm text-stone-500 dark:text-stone-400">{label}</dt>
              <dd className="text-2xl font-semibold tabular-nums text-stone-900 dark:text-cream-50">{value}</dd>
            </div>
          </div>
        ))}
      </dl>

      <div className="grid gap-4 sm:grid-cols-2">
        <ShortcutCard
          href="/admin/documents"
          title="Documents"
          description="Ajouter, consulter et supprimer la documentation utilisée par le chatbot."
          icon={<DocumentIcon />}
        />
        <ShortcutCard
          href="/admin/conversations"
          title="Conversations"
          description="Consulter les questions posées au chatbot, ses réponses et les sources citées."
          icon={<ChatIcon />}
        />
      </div>
    </div>
  );
}

function ShortcutCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`${card} group flex items-start gap-4 p-5 transition hover:border-sage-300 hover:shadow-md dark:hover:border-sage-700`}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-cream-100 text-stone-600 transition group-hover:bg-sage-600 group-hover:text-white dark:bg-stone-800 dark:text-stone-300">
        {icon}
      </span>
      <span className="flex flex-1 flex-col gap-1">
        <span className="flex items-center gap-1.5 font-semibold text-stone-900 dark:text-cream-50">
          {title}
          <ArrowRightIcon className="size-4 text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-sage-600" />
        </span>
        <span className="text-sm text-stone-500 dark:text-stone-400">{description}</span>
      </span>
    </Link>
  );
}
