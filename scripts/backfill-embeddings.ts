/**
 * Computes the embeddings of the chunks that have none yet (documents added in fulltext
 * mode, or before hybrid search existed), with the local model. Safe to run again.
 *
 *   npm run embeddings:backfill
 */
import { getDb } from "@/lib/db";
import { backfillEmbeddings } from "@/lib/embeddings/backfill";
import { localEmbedder } from "@/lib/embeddings/local";

async function main() {
  const db = getDb();
  const [{ missing }] = await db.$queryRaw<{ missing: number }[]>`
    SELECT count(*)::int AS missing FROM chunks WHERE embedding IS NULL
  `;
  if (missing === 0) {
    console.log("Tous les morceaux ont déjà un embedding.");
  } else {
    console.log(`${missing} morceau(x) sans embedding : calcul avec le modèle local…`);
    const started = performance.now();
    const done = await backfillEmbeddings(db, localEmbedder, {
      onProgress: (count) => console.log(`  ${count}/${missing}`),
    });
    console.log(`${done} embedding(s) calculé(s) en ${((performance.now() - started) / 1000).toFixed(1)} s.`);
  }
  await db.$disconnect();
}

main().catch((error) => {
  console.error((error as Error).message);
  process.exit(1);
});
