import { NOT_FOUND_ANSWER } from "@/lib/llm/prompt";

/** Excerpt numbers cited as [n] (also [1, 2] or [1][2]), in order of first appearance. */
export function citedRefs(answer: string, maxRef: number): number[] {
  const refs: number[] = [];
  for (const group of answer.matchAll(/\[(\d+(?:\s*,\s*\d+)*)\]/g)) {
    for (const value of group[1].split(",")) {
      const ref = Number(value.trim());
      if (ref >= 1 && ref <= maxRef && !refs.includes(ref)) refs.push(ref);
    }
  }
  return refs;
}

function simplify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** True when the answer is (only) the "not found" sentence, give or take quotes and punctuation. */
export function isNotFoundAnswer(answer: string): boolean {
  return simplify(answer) === simplify(NOT_FOUND_ANSWER);
}
