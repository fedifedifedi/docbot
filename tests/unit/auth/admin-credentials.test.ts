import { describe, expect, it } from "vitest";
import { normalizeEmail, parseAdminCredentials } from "@/lib/auth/admin-credentials";

describe("parseAdminCredentials", () => {
  it("reads and normalizes credentials from the environment", () => {
    expect(
      parseAdminCredentials({ ADMIN_EMAIL: " Admin@Example.COM ", ADMIN_PASSWORD: "a-long-password" }),
    ).toEqual({ email: "admin@example.com", password: "a-long-password" });
  });

  it("fails explicitly when variables are missing", () => {
    expect(() => parseAdminCredentials({})).toThrow(/ADMIN_EMAIL/);
    expect(() => parseAdminCredentials({ ADMIN_EMAIL: "admin@example.com" })).toThrow(
      /ADMIN_PASSWORD/,
    );
  });

  it("rejects an invalid email or a short password", () => {
    expect(() =>
      parseAdminCredentials({ ADMIN_EMAIL: "nope", ADMIN_PASSWORD: "a-long-password" }),
    ).toThrow(/ADMIN_EMAIL/);
    expect(() =>
      parseAdminCredentials({ ADMIN_EMAIL: "admin@example.com", ADMIN_PASSWORD: "short" }),
    ).toThrow(/ADMIN_PASSWORD/);
  });
});

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Foo@Bar.io ")).toBe("foo@bar.io");
  });
});
