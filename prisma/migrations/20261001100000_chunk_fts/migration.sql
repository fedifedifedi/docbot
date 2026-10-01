-- Full-text search on chunks (SPEC F4): French stemming + stop words, accent-insensitive.

CREATE EXTENSION IF NOT EXISTS unaccent;

-- French configuration that also strips accents ("fermé" and "ferme" match).
CREATE TEXT SEARCH CONFIGURATION docbot_fr (COPY = french);
ALTER TEXT SEARCH CONFIGURATION docbot_fr
  ALTER MAPPING FOR hword, hword_part, word WITH unaccent, french_stem;

-- Generated column: always in sync with `content`, never written by the application.
ALTER TABLE "chunks"
  ADD COLUMN "tsv" tsvector
  GENERATED ALWAYS AS (to_tsvector('docbot_fr'::regconfig, "content")) STORED;

CREATE INDEX "chunks_tsv_idx" ON "chunks" USING GIN ("tsv");
