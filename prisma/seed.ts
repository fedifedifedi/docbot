import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { parseAdminCredentials } from "../src/lib/auth/admin-credentials";
import { hashPassword } from "../src/lib/auth/password";

/**
 * Idempotent: creates the admin, or resets its password to ADMIN_PASSWORD.
 * The environment stays the single source of truth for the admin credentials.
 */
async function main() {
  const { email, password } = parseAdminCredentials(process.env);
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Cannot seed admin: DATABASE_URL is not set");

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const passwordHash = await hashPassword(password);
    await prisma.user.upsert({
      where: { email },
      create: { email, passwordHash },
      update: { passwordHash },
    });
    console.log(`[seed] admin ready: ${email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
