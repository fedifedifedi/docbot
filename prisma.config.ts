import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Not needed by `prisma generate` (e.g. during the Docker build), required by migrate.
    url: process.env.DATABASE_URL ?? "",
  },
});
