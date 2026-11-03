/**
 * Measures, with the real model, the similarity of the sentence the extractive provider would
 * quote for each reference question, to choose EXTRACTIVE_MIN_SIMILARITY on evidence.
 * Same path as the chat: hybrid search + abbreviation dictionary, then sentence scoring.
 *
 *   npm run measure:extractive
 */
import { getDb } from "@/lib/db";
import { localEmbedder } from "@/lib/embeddings/local";
import { getEnv } from "@/lib/env";
import { scoreSentences } from "@/lib/llm/extractive";
import { searchWithConfig } from "@/lib/search/search";
import { thresholdWindow } from "@/lib/search/threshold";
import { DEMO_DOCUMENT } from "../fixtures/demo/document";
import { REFERENCE_QUESTIONS } from "../fixtures/demo/questions";

const cell = (text: string, width: number) => (text.length > width ? `${text.slice(0, width - 1)}…` : text.padEnd(width));

async function main() {
  const good: number[] = [];
  const bad: number[] = [];
  console.log(`Recherche : hybride + dictionnaire (seuil vectoriel ${getEnv().VECTOR_MIN_SIMILARITY})\n`);
  console.log([cell("", 4), cell("Question", 42), cell("Passages", 8), cell("Phrase la plus proche (section)", 46), cell("sim.", 5), cell("Citation", 22)].join(" │ "));
  console.log("─".repeat(140));

  for (const q of REFERENCE_QUESTIONS) {
    const hits = await searchWithConfig({ mode: "hybrid", abbreviations: true }, q.question);
    if (hits.length === 0) {
      console.log([cell(q.id, 4), cell(q.question, 42), cell("0", 8), cell("— refus sans appel au provider", 46), cell("—", 5), cell("—", 22)].join(" │ "));
      continue;
    }
    // Like the provider: only the first (best-ranked) passage is quoted.
    const excerpts = hits.slice(0, 1).map((hit, i) => ({ ref: i + 1, documentTitle: hit.documentTitle, content: hit.content }));
    const scored = await scoreSentences(q.question, excerpts, { embedder: localEmbedder, abbreviations: true });
    const best = scored.reduce((a, b) => (b.similarity > a.similarity ? b : a));
    const fromDemo = hits[best.ref - 1].documentTitle === DEMO_DOCUMENT.title;
    const correct = q.expected !== null && fromDemo && best.heading === q.expected.section;
    (correct ? good : bad).push(best.similarity);
    const verdict = correct ? "bonne → à citer" : q.expected ? "mauvaise section → refus" : "hors sujet → refus";
    console.log(
      [cell(q.id, 4), cell(q.question, 42), cell(String(hits.length), 8), cell(`${best.text} (${best.heading ?? "—"})`, 46), cell(best.similarity.toFixed(3), 5), cell(verdict, 22)].join(" │ "),
    );
  }

  const window = thresholdWindow(good, bad);
  console.log(`
Mauvaises citations (hors sujet ou mauvaise section) : jusqu'à ${window.floor.toFixed(3)} → le seuil doit être AU-DESSUS.
Bonnes citations : la plus basse à ${window.ceiling.toFixed(3)} → le seuil doit être AU PLUS égal.
Marge = ${window.margin.toFixed(3)} ${window.suggested === null ? "→ aucun seuil ne sépare les deux groupes." : `→ milieu de l'intervalle : ${window.suggested.toFixed(3)}`}`);
  await getDb().$disconnect();
}

main().catch((error) => {
  console.error((error as Error).message);
  process.exit(1);
});
