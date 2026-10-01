import { describe, expect, it } from "vitest";
import { clientKey, createRateLimiter } from "@/lib/chat/rate-limit";

describe("createRateLimiter", () => {
  it("allows up to the limit within the window, then blocks with a retry delay", () => {
    let t = 0;
    const check = createRateLimiter({ limit: 2, windowMs: 60_000, now: () => t });

    expect(check("a")).toEqual({ allowed: true });
    t = 10_000;
    expect(check("a")).toEqual({ allowed: true });
    t = 20_000;
    expect(check("a")).toEqual({ allowed: false, retryAfterSeconds: 40 });
  });

  it("frees slots as old requests leave the window", () => {
    let t = 0;
    const check = createRateLimiter({ limit: 1, windowMs: 1_000, now: () => t });
    expect(check("a").allowed).toBe(true);
    expect(check("a").allowed).toBe(false);
    t = 1_000;
    expect(check("a").allowed).toBe(true);
  });

  it("counts each client separately", () => {
    const check = createRateLimiter({ limit: 1, windowMs: 60_000, now: () => 0 });
    expect(check("a").allowed).toBe(true);
    expect(check("b").allowed).toBe(true);
    expect(check("a").allowed).toBe(false);
  });
});

describe("clientKey", () => {
  it("prefers X-Real-IP, set by the proxy", () => {
    expect(
      clientKey(new Headers({ "x-real-ip": "198.51.100.2", "x-forwarded-for": "1.2.3.4, 198.51.100.2" })),
    ).toBe("198.51.100.2");
  });

  it("uses the last X-Forwarded-For entry, so a forged first entry does not dodge the limit", () => {
    expect(clientKey(new Headers({ "x-forwarded-for": "forged-1.2.3.4, 203.0.113.7" }))).toBe("203.0.113.7");
  });

  it("falls back to a shared bucket", () => {
    expect(clientKey(new Headers())).toBe("unknown");
  });
});
