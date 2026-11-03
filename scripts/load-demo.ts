/**
 * Loads the fictional imaging protocol (fixtures/demo/protocole-imagerie.md) into the local
 * database, through the same service as the admin form. Idempotent: an existing copy (same
 * title) is replaced.
 *
 *   npm run demo:load
 */
import { getDb } from "@/lib/db";
import { createDocument } from "@/lib/documents/service";
import { DEMO_DOCUMENT, readDemoDocument } from "../fixtures/demo/document";

async function main() {
  const db = getDb();
  const { count } = await db.document.deleteMany({ where: { title: DEMO_DOCUMENT.title } });
  const { chunkCount } = await createDocument({
    title: DEMO_DOCUMENT.title,
    content: readDemoDocument(),
    source: "FILE",
    filename: DEMO_DOCUMENT.filename,
  });
  console.log(
    `« ${DEMO_DOCUMENT.title} » ${count ? "remplacé" : "ajouté"} : ${chunkCount} morceaux indexés.`,
  );
  await db.$disconnect();
}

main().catch((error) => {
  console.error((error as Error).message);
  process.exit(1);
});
