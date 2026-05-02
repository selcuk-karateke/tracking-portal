import { createHash } from "crypto";

/** Wie in der Integrationsdoku: SHA-256 des Klartext-Tokens (hex). */
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
