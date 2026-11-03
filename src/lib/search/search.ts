import "server-only";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { expandAbbreviations } from "./abbreviations";
import { hybridSearch, type SearchMode } from "./hybrid";
import { vectorSearch } from "./semantic";
import { extractSearchTerms } from "./terms";

export type SearchHit = {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  content: string;
  /** Higher is better: ts_rank_cd in fulltext mode, RRF score in hybrid mode. */
  rank: number;
};

export type SearchOptions = {
  /** Maximum number of chunks returned (top-k). */
  limit?: number;
  /** Full-text chunks must rank strictly above this score (ts_rank_cd). */
  minRank?: number;
};

export const DEFAULT_SEARCH_LIMIT = 5;
/** Passages taken from each search before RRF fusion, in hybrid mode. */
export const HYBRID_CANDIDATES = 20;

/**
 * Full-text search over chunks (SPEC F4).
 *
 * Each question word goes through `plainto_tsquery('docbot_fr', …)` (stemming, stop words,
 * accent folding), then the words are OR-ed together: a natural-language question rarely
 * has *all* its words in one chunk, so AND semantics would almost never match. Ranking
 * with `ts_rank_cd` puts chunks matching more (and closer) words first.
 */
export async function fulltextSearch(
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

export type SearchConfig = {
  mode: SearchMode;
  /** Add the long form of medical abbreviations to the question before both searches. */
  abbreviations: boolean;
};

/** Search with an explicit configuration (used by `searchChunks` and by the evaluation). */
export async function searchWithConfig(
  { mode, abbreviations }: SearchConfig,
  rawQuestion: string,
  options: SearchOptions = {},
): Promise<SearchHit[]> {
  const question = abbreviations ? expandAbbreviations(rawQuestion) : rawQuestion;
  if (mode === "fulltext") return fulltextSearch(question, options);
  return hybridSearch(
    question,
    {
      fulltext: (q, limit) => fulltextSearch(q, { ...options, limit }),
      vector: (q, limit) => vectorSearch(q, limit),
    },
    {
      limit: options.limit ?? DEFAULT_SEARCH_LIMIT,
      candidates: HYBRID_CANDIDATES,
      minSimilarity: getEnv().VECTOR_MIN_SIMILARITY,
    },
  );
}

/**
 * The search used by the chat. Its signature is unchanged: the mode comes from SEARCH_MODE
 * (`fulltext` by default, `hybrid` = full-text + embeddings fused with RRF) and the
 * abbreviation dictionary from MEDICAL_ABBREVIATIONS. Either way, no relevant passage means
 * an empty array, so the bot refuses without calling the LLM.
 */
export async function searchChunks(question: string, options: SearchOptions = {}): Promise<SearchHit[]> {
  const env = getEnv();
  return searchWithConfig({ mode: env.SEARCH_MODE, abbreviations: env.MEDICAL_ABBREVIATIONS }, question, options);
}
