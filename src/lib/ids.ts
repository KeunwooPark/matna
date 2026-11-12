import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";

/** 128 random bits as 22 URL-safe characters. Used for event IDs and host tokens. */
export function newId(): string {
  return randomBytes(16).toString("base64url");
}

export function tokensMatch(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
