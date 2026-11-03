/**
 * Judges a search result against a reference question (pure: no I/O).
 * Pass = the first hit comes from the expected document and contains the expected phrase,
 * or, for an off-topic question, no hit at all (the bot then refuses without calling the LLM).
 */
export type EvaluatedHit = { documentTitle: string; content: string };

export type Expectation = { documentTitle: string; phrase: string } | null;

export type Verdict = {
  passed: boolean;
  /** What the first result is, in plain words. */
  obtained: string;
};

/** Heading of a chunk ("## Grossesse…"), or its first words when it has none. */
export function describeHit(hit: EvaluatedHit): string {
  const heading = hit.content.match(/^#{1,6}\s+(.+)$/m)?.[1];
  const label = heading ?? `${hit.content.replace(/\s+/g, " ").slice(0, 40)}…`;
  return `${label} (${hit.documentTitle})`;
}

export function judge(expected: Expectation, hits: EvaluatedHit[]): Verdict {
  if (expected === null) {
    return hits.length === 0
      ? { passed: true, obtained: "aucun passage → refus" }
      : { passed: false, obtained: `${hits.length} passage(s), 1er : ${describeHit(hits[0])}` };
  }
  if (hits.length === 0) return { passed: false, obtained: "aucun passage → refus" };
  const first = hits[0];
  const passed = first.documentTitle === expected.documentTitle && first.content.includes(expected.phrase);
  return { passed, obtained: describeHit(first) };
}
