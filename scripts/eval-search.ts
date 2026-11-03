/**
 * Asks the reference questions (fixtures/demo/questions.ts) to the search and prints a
 * before/after table: full-text, hybrid, hybrid + medical abbreviations. Needs the demo
 * document and its embeddings in the local database (`npm run demo:load`,
 * `npm run embeddings:backfill`).
 *
 *   npm run eval:search
 */
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { judge, type Verdict } from "@/lib/search/evaluation";
import { searchWithConfig, type SearchConfig } from "@/lib/search/search";
import { DEMO_DOCUMENT } from "../fixtures/demo/document";
import { REFERENCE_QUESTIONS } from "../fixtures/demo/questions";

const COLUMNS: { label: string; config: SearchConfig }[] = [
  { label: "full-text", config: { mode: "fulltext", abbreviations: false } },
  { label: "hybride", config: { mode: "hybrid", abbreviations: false } },
  { label: "hybride + dictionnaire", config: { mode: "hybrid", abbreviations: true } },
];
const WIDTH = 36;

function cell(text: string, width: number): string {
  return text.length > width ? `${text.slice(0, width - 1)}…` : text.padEnd(width);
}

/** Section of the first hit, without the document title (all from the demo document). */
function short(verdict: Verdict): string {
  return verdict.obtained.replace(` (${DEMO_DOCUMENT.title})`, "");
}

async function main() {
  const db = getDb();
  const documents = await db.document.findMany({ select: { title: true } });
  if (!documents.some((d) => d.title === DEMO_DOCUMENT.title)) {
    throw new Error(`Document de démonstration absent : lancez d'abord « npm run demo:load ».`);
  }
  const others = documents.filter((d) => d.title !== DEMO_DOCUMENT.title);
  if (others.length > 0) {
    console.log(`Note : ${others.length} autre(s) document(s) en base, en concurrence dans la recherche :`);
    for (const d of others) console.log(`  - ${d.title}`);
  }

  const results = new Map<string, Verdict[]>();
  for (const { label, config } of COLUMNS) {
    const verdicts: Verdict[] = [];
    for (const q of REFERENCE_QUESTIONS) {
      const hits = await searchWithConfig(config, q.question);
      verdicts.push(judge(q.expected && { documentTitle: DEMO_DOCUMENT.title, phrase: q.expected.phrase }, hits));
    }
    results.set(label, verdicts);
  }

  console.log(`\nSeuil de similarité (modes hybrides) : ${getEnv().VECTOR_MIN_SIMILARITY}`);
  const header = [cell("", 4), cell("Question", 40), cell("Attendu", 26), ...COLUMNS.map((c) => cell(c.label, WIDTH))];
  console.log(`\n${header.join(" │ ")}`);
  console.log(header.map((h) => "─".repeat(h.length)).join("─┼─"));
  REFERENCE_QUESTIONS.forEach((q, i) => {
    const expected = q.expected ? q.expected.section : "refus (0 passage)";
    const verdicts = COLUMNS.map(({ label }) => {
      const v = results.get(label)![i];
      return cell(`${v.passed ? "✅" : "❌"} ${short(v)}`, WIDTH);
    });
    console.log([cell(q.id, 4), cell(q.question, 40), cell(expected, 26), ...verdicts].join(" │ "));
  });

  const answerable = REFERENCE_QUESTIONS.flatMap((q, i) => (q.expected ? [i] : []));
  const offTopic = REFERENCE_QUESTIONS.flatMap((q, i) => (q.expected ? [] : [i]));
  console.log();
  for (const { label } of COLUMNS) {
    const verdicts = results.get(label)!;
    const score = (indexes: number[]) => `${indexes.filter((i) => verdicts[i].passed).length}/${indexes.length}`;
    console.log(
      `Score ${label.padEnd(23)} : ${score([...answerable, ...offTopic])}  (bonne section : ${score(answerable)}, refus corrects : ${score(offTopic)})`,
    );
  }
  await db.$disconnect();
}

main().catch((error) => {
  console.error((error as Error).message);
  process.exit(1);
});
