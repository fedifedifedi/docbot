import { Chat } from "./chat";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-cream-50 text-stone-800 dark:bg-stone-950 dark:text-stone-100">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 pt-10 sm:pt-14">
        <header className="flex flex-col items-center gap-3 text-center">
          <span
            aria-hidden
            className="flex size-14 items-center justify-center rounded-2xl bg-sage-600 text-white shadow-md shadow-sage-900/10 dark:bg-sage-500"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-7">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.04A8.97 8.97 0 0 0 6 3.75c-1.05 0-2.06.18-3 .51v14.25A8.99 8.99 0 0 1 6 18c2.3 0 4.4.87 6 2.29m0-14.25a8.97 8.97 0 0 1 6-2.29c1.05 0 2.06.18 3 .51v14.25A8.99 8.99 0 0 0 18 18a8.97 8.97 0 0 0-6 2.29m0-14.25v14.25"
              />
            </svg>
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-cream-50">DocBot</h1>
          <p className="max-w-md text-stone-600 dark:text-stone-400">
            Posez vos questions : DocBot répond uniquement à partir de la documentation de
            l&apos;entreprise et cite ses sources. S&apos;il ne trouve pas l&apos;information, il
            vous le dit.
          </p>
        </header>
        <Chat />
      </main>
    </div>
  );
}
