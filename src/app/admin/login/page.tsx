import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion — DocBot admin" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Espace administrateur</h1>
        <p className="text-sm text-zinc-500">Connectez-vous pour gérer la documentation.</p>
      </div>
      <LoginForm />
    </main>
  );
}
