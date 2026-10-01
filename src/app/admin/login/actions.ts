"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizeEmail } from "@/lib/auth/admin-credentials";
import { ADMIN_HOME } from "@/lib/auth/admin-routes";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

// `email` is echoed back so the field keeps its value: React resets forms after an action.
export type LoginState = { error: string | null; email: string };

const credentialsSchema = z.object({
  email: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(256),
});

const INVALID = "Email ou mot de passe incorrect.";

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const rawEmail = formData.get("email");
  const email = typeof rawEmail === "string" ? rawEmail : "";
  if (!parsed.success) return { error: INVALID, email };

  const user = await getDb().user.findUnique({
    where: { email: normalizeEmail(parsed.data.email) },
  });
  const valid = await verifyPassword(parsed.data.password, user?.passwordHash);
  if (!user || !valid) return { error: INVALID, email };

  await createSession(user.id);
  redirect(ADMIN_HOME);
}
