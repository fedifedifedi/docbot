import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "../../icons";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion — DocBot admin" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo size="lg" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-cream-50">
            Espace administrateur
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">Connectez-vous pour gérer la documentation.</p>
        </div>
      </div>
      <div className="rounded-3xl border border-cream-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <LoginForm />
      </div>
      <Link href="/" className="self-center text-sm text-stone-500 hover:text-sage-700 dark:text-stone-400 dark:hover:text-sage-300">
        Retour au chat
      </Link>
    </main>
  );
}
