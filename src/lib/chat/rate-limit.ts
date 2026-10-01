export type RateLimiterOptions = {
  /** Requests allowed per key within the window. */
  limit: number;
  windowMs: number;
  /** Injected clock, for tests. */
  now?: () => number;
};

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/**
 * Sliding-window limiter kept in memory. Enough for a single app instance (Railway):
 * it caps what one client can spend on the LLM provider through the public chat.
 */
export function createRateLimiter({ limit, windowMs, now = Date.now }: RateLimiterOptions) {
  const hits = new Map<string, number[]>();

  return function check(key: string): RateLimitResult {
    const t = now();
    const recent = (hits.get(key) ?? []).filter((at) => t - at < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return { allowed: false, retryAfterSeconds: Math.ceil((recent[0] + windowMs - t) / 1000) };
    }
    recent.push(t);
    hits.set(key, recent);
    // Keep memory bounded: drop keys whose hits are all outside the window.
    if (hits.size > 10_000) {
      for (const [k, times] of hits) if (times.every((at) => t - at >= windowMs)) hits.delete(k);
    }
    return { allowed: true };
  };
}

/**
 * Client IP behind the platform proxy. The *first* X-Forwarded-For entry is supplied by
 * the client and can be forged to dodge the limit; the proxy appends the address it saw,
 * so prefer X-Real-IP, then the *last* X-Forwarded-For entry.
 */
export function clientKey(headers: Headers): string {
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwarded = headers.get("x-forwarded-for")?.split(",").map((part) => part.trim()).filter(Boolean);
  return forwarded?.at(-1) ?? "unknown";
}
