import path from "node:path";
import { defineConfig } from "vitest/config";

/** Integration tests: real PostgreSQL (DATABASE_URL, migrated). Files run one at a time. */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // `server-only` throws outside a React Server Components bundle.
      "server-only": path.resolve(import.meta.dirname, "tests/integration/server-only-stub.ts"),
    },
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
