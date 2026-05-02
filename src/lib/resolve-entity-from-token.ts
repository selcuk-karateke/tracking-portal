import { prisma } from "./prisma";
import { hashToken } from "./token-hash";

export type ResolveFailureReason =
  | "not_found"
  | "revoked"
  | "expired"
  | "db_unavailable"
  | "not_configured";

export type ResolveEntityResult =
  | { ok: true; entityId: string }
  | { ok: false; reason: ResolveFailureReason };

export async function resolveEntityIdFromToken(
  token: string,
): Promise<ResolveEntityResult> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { ok: false, reason: "not_configured" };
  }

  const tokenHash = hashToken(token);

  try {
    const row = await prisma.supplierTrackingLink.findUnique({
      where: { tokenHash },
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

    return { ok: true, entityId: row.entityId };
  } catch (e) {
    console.error("[tracking] resolveEntityIdFromToken", e);
    return { ok: false, reason: "db_unavailable" };
  }
}
