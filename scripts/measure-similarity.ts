/**
 * Measures, with the real model, the cosine similarity between each reference question and
 * every chunk of the demo document, to choose VECTOR_MIN_SIMILARITY on evidence.
 * Needs the demo document with its embeddings (`npm run demo:load`, `npm run embeddings:backfill`).
 *
 *   npm run measure:similarity
 */
import { getDb } from "@/lib/db";
import { localEmbedder } from "@/lib/embeddings/local";
import { toVectorLiteral } from "@/lib/embeddings/vector";
import { thresholdWindow } from "@/lib/search/threshold";
import { DEMO_DOCUMENT } from "../fixtures/demo/document";
import { REFERENCE_QUESTIONS } from "../fixtures/demo/questions";

type Row = { content: string; similarity: number };

const section = (content: string) => content.match(/^## (.+)$/m)?.[1] ?? "(introduction)";
const cell = (text: string, width: number) => (text.length > width ? `${text.slice(0, width - 1)}…` : text.padEnd(width));
const fmt = (n: number) => n.toFixed(3);

async function main() {
  const db = getDb();
  const right: number[] = [];
  const offTopic: number[] = [];

  console.log(
    [cell("", 4), cell("Question", 46), cell("1er morceau (plus proche)", 34), cell("sim.", 5), cell("bonne section", 5), cell("rang", 4), cell("écart", 6)].join(" │ "),
  );
  console.log("─".repeat(124));

  for (const q of REFERENCE_QUESTIONS) {
    const query = toVectorLiteral(await localEmbedder.embedQuery(q.question));
    const rows = await db.$queryRaw<Row[]>`
      SELECT c.content, (1 - (c.embedding <=> ${query}::vector))::float8 AS similarity
      FROM chunks c JOIN documents d ON d.id = c.document_id
      WHERE d.title = ${DEMO_DOCUMENT.title} AND c.embedding IS NOT NULL
      ORDER BY c.embedding <=> ${query}::vector
    `;
    if (rows.length === 0) throw new Error("Aucun embedding : lancez « npm run demo:load » puis « npm run embeddings:backfill ».");
    const best = rows[0];
    let expectedCells = [cell("—", 5), cell("—", 4), cell("—", 6)];
    if (q.expected) {
      const rank = rows.findIndex((row) => row.content.includes(q.expected!.phrase));
      const sim = Number(rows[rank].similarity);
      right.push(sim);
      // Gap between the right chunk and the best wrong one: how clearly the model prefers it.
      const bestWrong = rows.find((_, i) => i !== rank)!;
      expectedCells = [cell(fmt(sim), 5), cell(String(rank + 1), 4), cell(fmt(sim - Number(bestWrong.similarity)), 6)];
    } else {
      offTopic.push(Number(best.similarity));
    }
    console.log(
      [cell(q.id, 4), cell(q.question, 46), cell(section(best.content), 34), cell(fmt(Number(best.similarity)), 5), ...expectedCells].join(" │ "),
    );
  }

  const window = thresholdWindow(right, offTopic);
  console.log(`
Hors sujet : meilleure similarité atteinte = ${fmt(window.floor)} → le seuil doit être AU-DESSUS.
Pertinentes : similarité la plus basse d'une bonne section = ${fmt(window.ceiling)} → le seuil doit être AU PLUS égal.
Marge = ${fmt(window.margin)} ${window.suggested === null ? "→ aucun seuil ne sépare les deux groupes." : `→ milieu de l'intervalle : ${fmt(window.suggested)}`}`);
  await db.$disconnect();
}

main().catch((error) => {
  console.error((error as Error).message);
  process.exit(1);
});
