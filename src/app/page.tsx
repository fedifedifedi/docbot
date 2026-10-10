import Link from "next/link";
import { Backdrop } from "./backdrop";
import { Chat } from "./chat";
import { Logo } from "./icons";

export default function Home() {
  return (
    <>
      <Backdrop />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pt-5">
        <header className="flex animate-fade-in items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="animate-float">
              <Logo size="md" />
            </span>
            <div className="leading-tight">
              <h1 className="font-display text-xl font-semibold tracking-tight text-stone-900 dark:text-cream-50">
                DocBot
              </h1>
              <p className="text-xs text-stone-500 dark:text-stone-400">L&apos;assistant de votre documentation</p>
            </div>
          </div>
          <Link
            href="/admin"
            className="rounded-full px-3 py-1.5 text-xs font-medium text-stone-500 ring-1 ring-cream-200 transition hover:bg-white/70 hover:text-stone-800 dark:text-stone-400 dark:ring-stone-800 dark:hover:bg-stone-900 dark:hover:text-stone-100"
          >
            Espace admin
          </Link>
        </header>
        <Chat />
      </main>
    </>
  );
}
