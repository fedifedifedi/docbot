/** A piece of an answer: plain text, or a citation group such as [1] or [1, 3]. */
export type AnswerSegment = { type: "text"; text: string } | { type: "cite"; refs: number[] };

/**
 * Removes Markdown heading markers ("# Support", "## Livraison") from a flattened excerpt.
 * Display only: the stored excerpt is left unchanged.
 */
export function cleanExcerpt(excerpt: string): string {
  return excerpt.replace(/(^|\s)#{1,6}\s+/g, "$1").trim();
}

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
