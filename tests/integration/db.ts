import { getDb } from "@/lib/db";

/** Empties the content tables (users are kept). Integration tests own the database. */
export async function resetContent() {
  const db = getDb();
  await db.message.deleteMany();
  await db.conversation.deleteMany();
  await db.chunk.deleteMany();
  await db.document.deleteMany();
}
