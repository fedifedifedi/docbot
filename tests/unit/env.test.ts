import { describe, expect, it } from "vitest";
import { DEFAULT_VECTOR_MIN_SIMILARITY, parseEnv } from "@/lib/env";

const base = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  SESSION_SECRET: "x".repeat(32),
};

describe("parseEnv", () => {
  it("defaults LLM_PROVIDER to mock", () => {
    expect(parseEnv(base).LLM_PROVIDER).toBe("mock");
  });

  it("accepts the anthropic provider", () => {
    expect(
      parseEnv({ ...base, LLM_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "sk-test" }).LLM_PROVIDER,
    ).toBe("anthropic");
  });

  it("rejects an unknown provider", () => {
    expect(() => parseEnv({ ...base, LLM_PROVIDER: "openai" })).toThrow(/LLM_PROVIDER/);
  });

  it("rejects a missing or non-postgres DATABASE_URL", () => {
    expect(() => parseEnv({ ...base, DATABASE_URL: undefined })).toThrow(/DATABASE_URL/);
    expect(() => parseEnv({ ...base, DATABASE_URL: "mysql://x" })).toThrow(/DATABASE_URL/);
  });

  it("requires ANTHROPIC_API_KEY only with the anthropic provider", () => {
    expect(() => parseEnv({ ...base, LLM_PROVIDER: "anthropic" })).toThrow(/ANTHROPIC_API_KEY/);
    expect(() =>
      parseEnv({ ...base, LLM_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "" }),
    ).toThrow(/ANTHROPIC_API_KEY/);
    expect(parseEnv({ ...base, LLM_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "sk-test" })).toMatchObject({
      ANTHROPIC_API_KEY: "sk-test",
      ANTHROPIC_MODEL: "claude-haiku-4-5-20251001",
    });
    expect(parseEnv({ ...base, ANTHROPIC_API_KEY: "" }).ANTHROPIC_API_KEY).toBeUndefined();
  });

  it("defaults SEARCH_MODE to fulltext and accepts hybrid", () => {
    expect(parseEnv(base).SEARCH_MODE).toBe("fulltext");
    expect(parseEnv({ ...base, SEARCH_MODE: "" }).SEARCH_MODE).toBe("fulltext");
    expect(parseEnv({ ...base, SEARCH_MODE: "hybrid" }).SEARCH_MODE).toBe("hybrid");
  });

  it("refuses an unknown SEARCH_MODE instead of silently picking one", () => {
    expect(() => parseEnv({ ...base, SEARCH_MODE: "vector" })).toThrow(/SEARCH_MODE/);
  });

  it("reads VECTOR_MIN_SIMILARITY as a number between 0 and 1", () => {
    expect(parseEnv(base).VECTOR_MIN_SIMILARITY).toBe(DEFAULT_VECTOR_MIN_SIMILARITY);
    expect(parseEnv({ ...base, VECTOR_MIN_SIMILARITY: "0.82" }).VECTOR_MIN_SIMILARITY).toBe(0.82);
    expect(() => parseEnv({ ...base, VECTOR_MIN_SIMILARITY: "1.5" })).toThrow(/VECTOR_MIN_SIMILARITY/);
    expect(() => parseEnv({ ...base, VECTOR_MIN_SIMILARITY: "beaucoup" })).toThrow(/VECTOR_MIN_SIMILARITY/);
  });

  it("reads MEDICAL_ABBREVIATIONS as a boolean, off by default", () => {
    expect(parseEnv(base).MEDICAL_ABBREVIATIONS).toBe(false);
    expect(parseEnv({ ...base, MEDICAL_ABBREVIATIONS: "true" }).MEDICAL_ABBREVIATIONS).toBe(true);
    expect(() => parseEnv({ ...base, MEDICAL_ABBREVIATIONS: "oui" })).toThrow(/MEDICAL_ABBREVIATIONS/);
  });

  it("requires a SESSION_SECRET of at least 32 characters", () => {
    expect(() => parseEnv({ ...base, SESSION_SECRET: undefined })).toThrow(/SESSION_SECRET/);
    expect(() => parseEnv({ ...base, SESSION_SECRET: "short" })).toThrow(/SESSION_SECRET/);
  });
});
