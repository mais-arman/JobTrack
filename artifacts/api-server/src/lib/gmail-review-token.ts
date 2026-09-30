import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const TTL_SECONDS = 24 * 60 * 60;
const VERSION = "v1";

function secret(): string {
  if (!process.env.SESSION_SECRET) throw new Error("SESSION_SECRET is required for Gmail review tokens.");
  return process.env.SESSION_SECRET;
}

function signature(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function createGmailReviewToken(messageId: string): string {
  if (!messageId || !messageId.trim() || messageId.length > 1024) throw new Error("Invalid Gmail message ID.");
  const key = createHash("sha256").update(messageId).digest("hex");
  const payload = `${VERSION}.${Math.floor(Date.now() / 1000)}.${key}`;
  return `${payload}.${signature(payload)}`;
}

// Returns the stable, non-reversible message key; never the original Gmail ID.
export function verifyGmailReviewToken(token: string): string {
  if (typeof token !== "string" || token.length > 256) throw new Error("Invalid Gmail review token.");
  const match = /^(v1)\.(\d{10})\.([a-f0-9]{64})\.([a-f0-9]{64})$/.exec(token);
  if (!match) throw new Error("Invalid Gmail review token.");
  const [, version, issuedAt, key, mac] = match;
  const payload = `${version}.${issuedAt}.${key}`;
  const actual = Buffer.from(mac, "hex");
  const expected = Buffer.from(signature(payload), "hex");
  if (!timingSafeEqual(actual, expected)) throw new Error("Invalid Gmail review token.");
  const now = Math.floor(Date.now() / 1000);
  const issued = Number(issuedAt);
  if (issued > now || now - issued >= TTL_SECONDS) throw new Error("Gmail review token expired or not yet valid.");
  return key;
}