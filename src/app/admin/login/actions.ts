"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizeEmail } from "@/lib/auth/admin-credentials";
import { ADMIN_HOME } from "@/lib/auth/admin-routes";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export type LoginState = { error: string | null };

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
  if (!parsed.success) return { error: INVALID };

  const user = await getDb().user.findUnique({
    where: { email: normalizeEmail(parsed.data.email) },
  });
  const valid = await verifyPassword(parsed.data.password, user?.passwordHash);
  if (!user || !valid) return { error: INVALID };

  await createSession(user.id);
  redirect(ADMIN_HOME);
}
