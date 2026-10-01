import { Chat } from "./chat";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pt-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">DocBot</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Posez vos questions : DocBot répond uniquement à partir de la documentation de
          l&apos;entreprise et cite ses sources. S&apos;il ne trouve pas l&apos;information, il
          vous le dit.
        </p>
      </header>
      <Chat />
    </main>
  );
}
