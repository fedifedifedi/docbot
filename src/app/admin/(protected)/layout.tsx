import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { logout } from "./actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <nav className="mx-auto flex w-full max-w-5xl items-center gap-6 px-4 py-3 text-sm">
          <Link href="/admin" className="font-semibold">
            DocBot admin
          </Link>
          <Link href="/admin/documents" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            Documents
          </Link>
          <Link href="/" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            Voir le chat public
          </Link>
          <form action={logout} className="ml-auto">
            <button type="submit" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
              Se déconnecter
            </button>
          </form>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
