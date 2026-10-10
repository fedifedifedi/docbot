/** A piece of an answer: plain text, or a citation group such as [1] or [1, 3]. */
export type AnswerSegment = { type: "text"; text: string } | { type: "cite"; refs: number[] };

/**
 * Splits an answer into text and citation segments so the UI can render citations as badges.
 * Pure (no server import) so it can run in the client bundle.
 */
export function splitCitations(answer: string): AnswerSegment[] {
  const segments: AnswerSegment[] = [];
  let last = 0;
  for (const match of answer.matchAll(/\[(\d+(?:\s*,\s*\d+)*)\]/g)) {
    if (match.index > last) segments.push({ type: "text", text: answer.slice(last, match.index) });
    segments.push({ type: "cite", refs: match[1].split(",").map((value) => Number(value.trim())) });
    last = match.index + match[0].length;
  }
  if (last < answer.length) segments.push({ type: "text", text: answer.slice(last) });
  return segments;
}
