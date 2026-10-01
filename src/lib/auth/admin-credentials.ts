import { z } from "zod";

const schema = z.object({
  ADMIN_EMAIL: z
    .string("ADMIN_EMAIL is required")
    .trim()
    .toLowerCase()
    .pipe(z.email("ADMIN_EMAIL must be a valid email")),
  ADMIN_PASSWORD: z.string().min(12, "ADMIN_PASSWORD must be at least 12 characters"),
});

export type AdminCredentials = { email: string; password: string };

/** Reads the seeded admin's credentials from the environment. Never hardcoded. */
export function parseAdminCredentials(raw: Record<string, string | undefined>): AdminCredentials {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Cannot seed admin: ${details}`);
  }
  return {
    email: result.data.ADMIN_EMAIL,
    password: result.data.ADMIN_PASSWORD,
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
