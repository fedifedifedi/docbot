/**
 * Asks the reference questions (fixtures/demo/questions.ts) to the search and prints a
 * comparison table. Needs the demo document in the local database (`npm run demo:load`).
 *
 *   npm run eval:search
 */
import { getDb } from "@/lib/db";
import { judge, type Verdict } from "@/lib/search/evaluation";
import { getEnv } from "@/lib/env";
import { searchWithMode } from "@/lib/search/search";
import { DEMO_DOCUMENT } from "../fixtures/demo/document";
import { REFERENCE_QUESTIONS } from "../fixtures/demo/questions";

type Mode = "fulltext" | "hybrid";
const MODES: Mode[] = ["fulltext", "hybrid"];

function run(mode: Mode, question: string) {
  return searchWithMode(mode, question);
}

function cell(text: string, width: number): string {
  return text.length > width ? `${text.slice(0, width - 1)}…` : text.padEnd(width);
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

  const results: Record<Mode, Verdict[]> = { fulltext: [], hybrid: [] };
  for (const mode of MODES) {
    for (const q of REFERENCE_QUESTIONS) {
      const hits = await run(mode, q.question);
      results[mode].push(judge(q.expected && { documentTitle: DEMO_DOCUMENT.title, phrase: q.expected.phrase }, hits));
    }
  }

  console.log(`\nSeuil de similarité (mode hybrid) : ${getEnv().VECTOR_MIN_SIMILARITY}`);
  const header = [cell("", 4), cell("Question", 46), cell("Attendu", 30), ...MODES.map((m) => cell(m, 44))];
  console.log(`\n${header.join(" │ ")}`);
  console.log(header.map((h) => "─".repeat(h.length)).join("─┼─"));
  REFERENCE_QUESTIONS.forEach((q, i) => {
    const expected = q.expected ? q.expected.section : "refus (0 passage)";
    const verdicts = MODES.map((mode) => {
      const v = results[mode][i];
      return cell(`${v.passed ? "✅" : "❌"} ${v.obtained}`, 44);
    });
    console.log([cell(q.id, 4), cell(q.question, 46), cell(expected, 30), ...verdicts].join(" │ "));
  });

  const answerable = REFERENCE_QUESTIONS.map((q, i) => (q.expected ? i : -1)).filter((i) => i >= 0);
  const offTopic = REFERENCE_QUESTIONS.map((q, i) => (q.expected ? -1 : i)).filter((i) => i >= 0);
  const score = (mode: Mode, indexes: number[]) => `${indexes.filter((i) => results[mode][i].passed).length}/${indexes.length}`;
  console.log();
  for (const mode of MODES) {
    console.log(
      `Score ${mode.padEnd(8)} : ${score(mode, [...answerable, ...offTopic])}  (bonne section : ${score(mode, answerable)}, refus corrects : ${score(mode, offTopic)})`,
    );
  }
  await db.$disconnect();
}

main().catch((error) => {
  console.error((error as Error).message);
  process.exit(1);
});
