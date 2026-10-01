import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password hashing", () => {
  it("hashes with bcrypt and never stores the plain password", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
    expect(hash).not.toContain("correct horse battery");
  });

  it("verifies the right password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct horse battery");
    await expect(verifyPassword("correct horse battery", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong password", hash)).resolves.toBe(false);
  });

  it("returns false when there is no stored hash (unknown account)", async () => {
    await expect(verifyPassword("anything", null)).resolves.toBe(false);
    await expect(verifyPassword("anything", undefined)).resolves.toBe(false);
  });
});
