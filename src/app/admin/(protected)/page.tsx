import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tableau de bord — DocBot admin" };

export default function AdminHome() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        La gestion des documents et l&apos;historique des conversations arrivent dans les
        prochaines versions.
      </p>
    </div>
  );
}
