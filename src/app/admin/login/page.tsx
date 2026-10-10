import type { Metadata } from "next";
import Link from "next/link";
import { Backdrop } from "../../backdrop";
import { Logo } from "../../icons";
import { card } from "../styles";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion — DocBot admin" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <Backdrop />
      <div className="flex animate-fade-up flex-col items-center gap-3 text-center">
        <span className="animate-float">
          <Logo size="lg" />
        </span>
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-stone-900 dark:text-cream-50">
            Espace administrateur
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">Connectez-vous pour gérer la documentation.</p>
        </div>
      </div>
      <div className={`${card} animate-fade-up p-6`} style={{ animationDelay: "120ms" }}>
        <LoginForm />
      </div>
      <Link
        href="/"
        className="animate-fade-in self-center text-sm text-stone-500 hover:text-sage-700 dark:text-stone-400 dark:hover:text-sage-300"
        style={{ animationDelay: "300ms" }}
      >
        Retour au chat
      </Link>
    </main>
  );
}
