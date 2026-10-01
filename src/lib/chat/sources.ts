import { z } from "zod";
import type { Source } from "./answer";

const sourceSchema = z.object({
  ref: z.number(),
  documentId: z.string(),
  documentTitle: z.string(),
  chunkIndex: z.number(),
  excerpt: z.string(),
});

/**
 * Reads the sources snapshot stored as JSON on a message. Never throws: a missing or
 * malformed value (e.g. written by an older version) yields only the entries that are valid.
 */
export function parseStoredSources(value: unknown): Source[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = sourceSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}
