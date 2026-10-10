"use client";

import { useActionState } from "react";
import { AlertIcon } from "../../icons";
import { alertBox, field, label, primaryButton } from "../styles";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: null, email: "" };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className={label}>
        Email
        <input
          type="email"
          name="email"
          autoComplete="username"
          defaultValue={state.email}
          required
          className={field}
        />
      </label>
      <label className={label}>
        Mot de passe
        <input type="password" name="password" autoComplete="current-password" required className={field} />
      </label>
      {state.error && (
        <p role="alert" className={alertBox}>
          <AlertIcon className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={`${primaryButton} mt-1 w-full`}>
        {pending ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
