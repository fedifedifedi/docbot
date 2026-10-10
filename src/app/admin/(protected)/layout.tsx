import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { Backdrop } from "../../backdrop";
import { ChatIcon, DocumentIcon, ExternalIcon, Logo, LogoutIcon } from "../../icons";
import { logout } from "./actions";
import { NavLink } from "./nav-link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="flex flex-1 flex-col">
      <Backdrop subtle />
      <header className="sticky top-0 z-10 border-b border-cream-200 bg-cream-50/85 backdrop-blur dark:border-stone-800 dark:bg-stone-950/85">
        <nav className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-2 gap-y-2 px-4 py-3 text-sm">
          <Link href="/admin" className="mr-3 flex shrink-0 items-center gap-2 font-semibold text-stone-900 dark:text-cream-50">
            <Logo size="sm" />
            <span className="font-display text-base">
              DocBot <span className="font-sans text-sm font-normal text-stone-500 dark:text-stone-400">admin</span>
            </span>
          </Link>
          {/* On phones: logo and actions on the first line, sections on the second. */}
          <div className="order-last flex w-full gap-1 sm:order-none sm:w-auto">
            <NavLink href="/admin/documents">
              <DocumentIcon className="size-4" />
              Documents
            </NavLink>
            <NavLink href="/admin/conversations">
              <ChatIcon className="size-4" />
              Conversations
            </NavLink>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-stone-600 transition hover:bg-cream-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-900 dark:hover:text-stone-100"
            >
              <span className="sm:hidden">Chat</span>
              <span className="hidden sm:inline">Voir le chat public</span>
              <ExternalIcon className="size-3.5" />
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-stone-600 transition hover:bg-red-50 hover:text-red-700 dark:text-stone-400 dark:hover:bg-red-950/50 dark:hover:text-red-300"
              >
                <LogoutIcon className="size-4" />
                {/* Icon only on phones; the label stays available to screen readers. */}
                <span className="sr-only sm:not-sr-only">Se déconnecter</span>
              </button>
            </form>
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-10">{children}</main>
    </div>
  );
}
