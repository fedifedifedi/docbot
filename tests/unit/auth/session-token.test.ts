import { describe, expect, it } from "vitest";
import {
  SESSION_TTL_SECONDS,
  signSessionToken,
  verifySessionToken,
} from "@/lib/auth/session-token";

const SECRET = "a".repeat(32);
const OTHER_SECRET = "b".repeat(32);

describe("session token", () => {
  it("round-trips the user id", async () => {
    const token = await signSessionToken({ userId: "user_1" }, SECRET);
    await expect(verifySessionToken(token, SECRET)).resolves.toEqual({ userId: "user_1" });
  });

  it("rejects a missing token", async () => {
    await expect(verifySessionToken(undefined, SECRET)).resolves.toBeNull();
    await expect(verifySessionToken("", SECRET)).resolves.toBeNull();
  });

  it("rejects a token signed with another secret", async () => {
    const token = await signSessionToken({ userId: "user_1" }, OTHER_SECRET);
    await expect(verifySessionToken(token, SECRET)).resolves.toBeNull();
  });

  it("rejects a tampered payload", async () => {
    const token = await signSessionToken({ userId: "user_1" }, SECRET);
    const [header, , signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ userId: "attacker" })).toString("base64url");
    await expect(verifySessionToken(`${header}.${forged}.${signature}`, SECRET)).resolves.toBeNull();
  });

  it("expires after the TTL", async () => {
    const issuedAt = new Date("2026-01-01T08:00:00Z");
    const token = await signSessionToken({ userId: "user_1" }, SECRET, issuedAt);
    const justBefore = new Date(issuedAt.getTime() + (SESSION_TTL_SECONDS - 60) * 1000);
    const after = new Date(issuedAt.getTime() + (SESSION_TTL_SECONDS + 60) * 1000);

    await expect(verifySessionToken(token, SECRET, justBefore)).resolves.not.toBeNull();
    await expect(verifySessionToken(token, SECRET, after)).resolves.toBeNull();
  });

  it("rejects garbage", async () => {
    await expect(verifySessionToken("not.a.jwt", SECRET)).resolves.toBeNull();
  });
});
