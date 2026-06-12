import { prisma } from "./prisma";
import { normalizeManufacturerEmail } from "./normalize-manufacturer-email";
import { hashToken } from "./token-hash";

export type ResolveFailureReason =
  | "not_found"
  | "revoked"
  | "expired"
  | "db_unavailable"
  | "not_configured"
  /** Link ohne Hersteller-E-Mail (Altbestand) — neuer Link in Manage erforderlich. */
  | "manufacturer_email_missing";

export type ResolveEntityResult =
  | { ok: true; entityId: string; manufacturerEmail: string }
  | { ok: false; reason: ResolveFailureReason };

function looksLikePlainToken(value: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value.trim());
}

export async function resolveEntityIdFromToken(
  token: string,
): Promise<ResolveEntityResult> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { ok: false, reason: "not_configured" };
  }

  const trimmed = token.trim();
  if (!trimmed) {
    return { ok: false, reason: "not_found" };
  }

  try {
    const row = looksLikePlainToken(trimmed)
      ? await prisma.supplierTrackingLink.findUnique({
          where: { tokenHash: hashToken(trimmed) },
        })
      : await prisma.supplierTrackingLink.findFirst({
          where: { slug: trimmed.toLowerCase() },
        });

    if (!row) {
      return { ok: false, reason: "not_found" };
    }
    if (row.revokedAt != null) {
      return { ok: false, reason: "revoked" };
    }
    if (row.expiresAt != null && row.expiresAt < new Date()) {
      return { ok: false, reason: "expired" };
    }

    const rawEmail = row.manufacturerEmail?.trim();
    if (!rawEmail) {
      return { ok: false, reason: "manufacturer_email_missing" };
    }

    return {
      ok: true,
      entityId: row.entityId,
      manufacturerEmail: normalizeManufacturerEmail(rawEmail),
    };
  } catch (e) {
    console.error("[tracking] resolveEntityIdFromToken", e);
    return { ok: false, reason: "db_unavailable" };
  }
}
