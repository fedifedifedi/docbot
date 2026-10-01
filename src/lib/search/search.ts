import "server-only";
import { getDb } from "@/lib/db";
import { extractSearchTerms } from "./terms";

export type SearchHit = {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  content: string;
  rank: number;
};

export type SearchOptions = {
  /** Maximum number of chunks returned (top-k). */
  limit?: number;
  /** Chunks must rank strictly above this score (ts_rank_cd). */
  minRank?: number;
};

export const DEFAULT_SEARCH_LIMIT = 5;

/**
 * Full-text search over chunks (SPEC F4).
 *
 * Each question word goes through `plainto_tsquery('docbot_fr', …)` (stemming, stop words,
 * accent folding), then the words are OR-ed together: a natural-language question rarely
 * has *all* its words in one chunk, so AND semantics would almost never match. Ranking
 * with `ts_rank_cd` puts chunks matching more (and closer) words first.
 */
export async function searchChunks(
  question: string,
  { limit = DEFAULT_SEARCH_LIMIT, minRank = 0 }: SearchOptions = {},
): Promise<SearchHit[]> {
  const terms = extractSearchTerms(question);
  if (terms.length === 0) return [];

  const rows = await getDb().$queryRaw<SearchHit[]>`
    WITH q AS (
      SELECT string_agg('(' || t || ')', ' | ')::tsquery AS query
      FROM (
        SELECT DISTINCT plainto_tsquery('docbot_fr', term)::text AS t
        FROM unnest(${terms}::text[]) AS term
      ) words
      WHERE t <> ''
    )
    SELECT
      c.id AS "chunkId",
      c.document_id AS "documentId",
      d.title AS "documentTitle",
      c.index AS "chunkIndex",
      c.content,
      ts_rank_cd(c.tsv, q.query)::float8 AS rank
    FROM q
    JOIN chunks c ON q.query IS NOT NULL AND c.tsv @@ q.query
    JOIN documents d ON d.id = c.document_id
    WHERE ts_rank_cd(c.tsv, q.query) > ${minRank}
    ORDER BY rank DESC, d.created_at DESC, c.index ASC
    LIMIT ${limit}
  `;
  return rows.map((row) => ({ ...row, rank: Number(row.rank) }));
}
