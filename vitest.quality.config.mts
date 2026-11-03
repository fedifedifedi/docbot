import "dotenv/config";
import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Search-quality tests with the REAL embedding model, on the local database (`.env`).
 * Local only, not run by the CI (no model download there): `npm run test:search-quality`.
 * Prerequisites: pgvector, `npm run model:download`. The demo document is (re)loaded by the
 * tests themselves; nothing else in the database is touched.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "tests/integration/server-only-stub.ts"),
    },
  },
  test: {
    include: ["tests/quality/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
