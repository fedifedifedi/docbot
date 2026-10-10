import { Chat } from "./chat";
import { Logo } from "./icons";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 pt-10 sm:pt-14">
      <header className="flex flex-col items-center gap-3 text-center">
        <Logo size="lg" />
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-cream-50">DocBot</h1>
        <p className="max-w-md text-stone-600 dark:text-stone-400">
          Posez vos questions : DocBot répond uniquement à partir de la documentation de
          l&apos;entreprise et cite ses sources. S&apos;il ne trouve pas l&apos;information, il
          vous le dit.
        </p>
      </header>
      <Chat />
    </main>
  );
}
