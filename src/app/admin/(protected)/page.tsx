import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { listConversations } from "@/lib/chat/history";
import { listDocuments } from "@/lib/documents/service";
import { ArrowRightIcon, ChatIcon, DocumentIcon, PuzzleIcon } from "../../icons";
import { card, liftCard, pageTitle } from "../styles";
import { CountUp } from "./count-up";

export const metadata: Metadata = { title: "Tableau de bord — DocBot admin" };

export default async function AdminHome() {
  await requireAdmin();
  const [documents, { total: conversationCount }] = await Promise.all([listDocuments(), listConversations(1)]);
  const chunkCount = documents.reduce((sum, doc) => sum + doc._count.chunks, 0);

  const stats = [
    { label: "Documents", value: documents.length, icon: DocumentIcon, tone: "bg-sage-100 text-sage-700 dark:bg-sage-900 dark:text-sage-200" },
    { label: "Chunks indexés", value: chunkCount, icon: PuzzleIcon, tone: "bg-clay-100 text-clay-600 dark:bg-clay-700/40 dark:text-clay-200" },
    { label: "Conversations", value: conversationCount, icon: ChatIcon, tone: "bg-cream-200 text-stone-700 dark:bg-stone-800 dark:text-stone-200" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className={pageTitle}>Tableau de bord</h1>
        <p className="text-stone-500 dark:text-stone-400">
          Gérez la documentation du chatbot et suivez les questions des visiteurs.
        </p>
      </div>

      <dl className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, tone }, i) => (
          <div
            key={label}
            className={`${card} flex animate-fade-up items-center gap-4 p-5`}
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
              <Icon />
            </span>
            <div className="flex flex-col-reverse">
              <dt className="text-sm text-stone-500 dark:text-stone-400">{label}</dt>
              <dd className="font-display text-3xl font-semibold tabular-nums text-stone-900 dark:text-cream-50">
                <CountUp value={value} />
              </dd>
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
          delay={270}
        />
        <ShortcutCard
          href="/admin/conversations"
          title="Conversations"
          description="Consulter les questions posées au chatbot, ses réponses et les sources citées."
          icon={<ChatIcon />}
          delay={360}
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
  delay,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  delay: number;
}) {
  return (
    <Link
      href={href}
      className={`${card} ${liftCard} group flex animate-fade-up items-start gap-4 p-5`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-cream-100 text-stone-600 transition duration-300 group-hover:rotate-[-6deg] group-hover:bg-gradient-to-br group-hover:from-sage-500 group-hover:to-sage-700 group-hover:text-white dark:bg-stone-800 dark:text-stone-300">
        {icon}
      </span>
      <span className="flex flex-1 flex-col gap-1">
        <span className="flex items-center gap-1.5 font-display text-lg font-semibold text-stone-900 dark:text-cream-50">
          {title}
          <ArrowRightIcon className="size-4 text-clay-400 transition group-hover:translate-x-1" />
        </span>
        <span className="text-sm text-stone-500 dark:text-stone-400">{description}</span>
      </span>
    </Link>
  );
}
