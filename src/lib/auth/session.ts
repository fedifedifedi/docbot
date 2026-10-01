import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { ADMIN_LOGIN } from "./admin-routes";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  signSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "./session-token";

export async function createSession(userId: string): Promise<void> {
  const token = await signSessionToken({ userId }, getEnv().SESSION_SECRET);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function deleteSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token, getEnv().SESSION_SECRET);
}

/**
 * Authorization check for admin pages and server actions. The proxy only does an
 * optimistic redirect; this is the check that actually protects data. It also checks
 * the account still exists, so a deleted admin's token stops working immediately.
 */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession();
  const user = session
    ? await getDb().user.findUnique({ where: { id: session.userId }, select: { id: true } })
    : null;
  if (!session || !user) redirect(ADMIN_LOGIN);
  return session;
}
