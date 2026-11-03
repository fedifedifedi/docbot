/**
 * Asks the reference questions (fixtures/demo/questions.ts) to the search and prints a
 * comparison table. Needs the demo document in the local database (`npm run demo:load`).
 *
 *   npm run eval:search
 */
import { getDb } from "@/lib/db";
import { judge, type Verdict } from "@/lib/search/evaluation";
import { searchChunks } from "@/lib/search/search";
import { DEMO_DOCUMENT } from "../fixtures/demo/document";
import { REFERENCE_QUESTIONS } from "../fixtures/demo/questions";

type Mode = "fulltext" | "hybrid";
const MODES: Mode[] = ["fulltext", "hybrid"];

async function run(mode: Mode, question: string) {
  if (mode === "hybrid") return null; // Wired after the pgvector migration.
  return searchChunks(question);
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

  const results: Record<Mode, (Verdict | null)[]> = { fulltext: [], hybrid: [] };
  for (const mode of MODES) {
    for (const q of REFERENCE_QUESTIONS) {
      const hits = await run(mode, q.question);
      results[mode].push(
        hits &&
          judge(q.expected && { documentTitle: DEMO_DOCUMENT.title, phrase: q.expected.phrase }, hits),
      );
    }
  }

  const header = [cell("", 4), cell("Question", 50), cell("Attendu", 34), ...MODES.map((m) => cell(m, 46))];
  console.log(`\n${header.join(" │ ")}`);
  console.log(header.map((h) => "─".repeat(h.length)).join("─┼─"));
  REFERENCE_QUESTIONS.forEach((q, i) => {
    const expected = q.expected ? q.expected.section : "refus (0 passage)";
    const verdicts = MODES.map((mode) => {
      const v = results[mode][i];
      return cell(v ? `${v.passed ? "✅" : "❌"} ${v.obtained}` : "— pas encore branché", 46);
    });
    console.log([cell(q.id, 4), cell(q.question, 50), cell(expected, 34), ...verdicts].join(" │ "));
  });

  console.log();
  for (const mode of MODES) {
    const verdicts = results[mode];
    if (verdicts.some((v) => v === null)) {
      console.log(`Score ${mode} : non disponible (après la migration pgvector)`);
    } else {
      console.log(`Score ${mode} : ${verdicts.filter((v) => v!.passed).length}/${verdicts.length}`);
    }
  }
  await db.$disconnect();
}

main().catch((error) => {
  console.error((error as Error).message);
  process.exit(1);
});
