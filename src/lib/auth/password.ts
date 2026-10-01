import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

const COST = 12;

// Compared against when the account does not exist, so a failed login costs the same
// time whether or not the email is known (no user enumeration through timing).
let dummyHash: Promise<string> | undefined;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export async function verifyPassword(
  password: string,
  hash: string | null | undefined,
): Promise<boolean> {
  if (!hash) {
    dummyHash ??= bcrypt.hash(randomBytes(16).toString("hex"), COST);
    await bcrypt.compare(password, await dummyHash);
    return false;
  }
  return bcrypt.compare(password, hash);
}
