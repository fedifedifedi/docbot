export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">DocBot</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Assistant documentaire : posez vos questions, il répond uniquement à partir de la
        documentation de l&apos;entreprise et cite ses sources.
      </p>
      <p className="text-sm text-zinc-500">Le chat arrive bientôt.</p>
    </main>
  );
}
