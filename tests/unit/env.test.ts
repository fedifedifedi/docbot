import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

const base = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  SESSION_SECRET: "x".repeat(32),
};

describe("parseEnv", () => {
  it("defaults LLM_PROVIDER to mock", () => {
    expect(parseEnv(base).LLM_PROVIDER).toBe("mock");
  });

  it("accepts the anthropic provider", () => {
    expect(parseEnv({ ...base, LLM_PROVIDER: "anthropic" }).LLM_PROVIDER).toBe("anthropic");
  });

  it("rejects an unknown provider", () => {
    expect(() => parseEnv({ ...base, LLM_PROVIDER: "openai" })).toThrow(/LLM_PROVIDER/);
  });

  it("rejects a missing or non-postgres DATABASE_URL", () => {
    expect(() => parseEnv({ ...base, DATABASE_URL: undefined })).toThrow(/DATABASE_URL/);
    expect(() => parseEnv({ ...base, DATABASE_URL: "mysql://x" })).toThrow(/DATABASE_URL/);
  });

  it("requires a SESSION_SECRET of at least 32 characters", () => {
    expect(() => parseEnv({ ...base, SESSION_SECRET: undefined })).toThrow(/SESSION_SECRET/);
    expect(() => parseEnv({ ...base, SESSION_SECRET: "short" })).toThrow(/SESSION_SECRET/);
  });
});
