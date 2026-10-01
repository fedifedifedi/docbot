import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "docbot_session";
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

export type SessionPayload = { userId: string };

function key(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

/** Signs a short-lived HS256 session token. Pure: no cookies, no env access. */
export async function signSessionToken(
  payload: SessionPayload,
  secret: string,
  now: Date = new Date(),
): Promise<string> {
  const iat = Math.floor(now.getTime() / 1000);
  return new SignJWT({ userId: payload.userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(iat)
    .setExpirationTime(iat + SESSION_TTL_SECONDS)
    .sign(key(secret));
}

/** Returns the payload of a valid token, or null (missing, tampered, expired, wrong secret). */
export async function verifySessionToken(
  token: string | undefined,
  secret: string,
  now: Date = new Date(),
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(secret), {
      algorithms: ["HS256"],
      currentDate: now,
    });
    return typeof payload.userId === "string" ? { userId: payload.userId } : null;
  } catch {
    return null;
  }
}
