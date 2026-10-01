"use server";

import { redirect } from "next/navigation";
import { ADMIN_LOGIN } from "@/lib/auth/admin-routes";
import { deleteSession } from "@/lib/auth/session";

export async function logout(): Promise<void> {
  await deleteSession();
  redirect(ADMIN_LOGIN);
}
