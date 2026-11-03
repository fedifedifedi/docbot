-- Vector search on chunks (hybrid search): one embedding per chunk, stored with pgvector.

-- pgvector is not a "trusted" extension: on a database where the app role is not superuser,
-- an administrator runs this once beforehand; here it is then a no-op.
CREATE EXTENSION IF NOT EXISTS vector;

-- 384 dimensions = Xenova/multilingual-e5-small. NULL until computed (documents indexed in
-- fulltext mode, or before `npm run embeddings:backfill`).
ALTER TABLE "chunks" ADD COLUMN "embedding" vector(384);

-- HNSW: approximate nearest-neighbour graph, fast at query time and usable on an empty table
-- (unlike IVFFlat, which needs data to build its lists). Cosine distance, as for E5 vectors.
CREATE INDEX "chunks_embedding_idx" ON "chunks" USING hnsw ("embedding" vector_cosine_ops);
