import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

const DATABASE_URL = "postgresql://user:pass@localhost:5432/db";

describe("parseEnv", () => {
  it("defaults LLM_PROVIDER to mock", () => {
    expect(parseEnv({ DATABASE_URL }).LLM_PROVIDER).toBe("mock");
  });

  it("accepts the anthropic provider", () => {
    expect(parseEnv({ DATABASE_URL, LLM_PROVIDER: "anthropic" }).LLM_PROVIDER).toBe("anthropic");
  });

  it("rejects an unknown provider", () => {
    expect(() => parseEnv({ DATABASE_URL, LLM_PROVIDER: "openai" })).toThrow(/LLM_PROVIDER/);
  });

  it("rejects a missing or non-postgres DATABASE_URL", () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
    expect(() => parseEnv({ DATABASE_URL: "mysql://x" })).toThrow(/DATABASE_URL/);
  });
});
