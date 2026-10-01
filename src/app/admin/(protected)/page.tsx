import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Tableau de bord — DocBot admin" };

export default function AdminHome() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>
      <ul className="flex flex-col gap-2 text-zinc-600 dark:text-zinc-400">
        <li>
          <Link href="/admin/documents" className="font-medium text-zinc-900 hover:underline dark:text-zinc-100">
            Documents
          </Link>{" "}
          — ajouter, consulter et supprimer la documentation utilisée par le chatbot.
        </li>
        <li>L&apos;historique des conversations arrive dans une prochaine version.</li>
      </ul>
    </div>
  );
}
